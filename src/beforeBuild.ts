/**
 * Copyright 2023 Fluence Labs Limited
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import assert from "node:assert";
import {
  access,
  cp,
  mkdir,
  readFile,
  unlink,
  writeFile,
} from "node:fs/promises";
import { join, sep } from "node:path";

import { compile } from "./lib/aqua.js";
import { AQUA_EXT, FS_OPTIONS } from "./lib/const.js";

const getAquaDependencyImports = async (
  peerDependency: string
): Promise<Array<string>> => {
  const peerDependencyPackageJSONPath = join(
    "node_modules",
    peerDependency,
    "package.json"
  );

  const peerDependencyPackageJSON = await readFile(
    peerDependencyPackageJSONPath,
    FS_OPTIONS
  );

  const parsedPackageJSON = JSON.parse(peerDependencyPackageJSON);

  assert(
    typeof parsedPackageJSON === "object" &&
      parsedPackageJSON !== null &&
      "dependencies" in parsedPackageJSON
  );

  const paths = Object.entries(parsedPackageJSON?.dependencies ?? {}).map(
    ([name, version]) => {
      return join(
        "node_modules",
        ".pnpm",
        `${name.replace(sep, "+")}@${String(version)}`,
        "node_modules"
      );
    }
  );

  const validImports = await Promise.allSettled(
    paths.map((p) => {
      return access(p);
    })
  );

  return paths.filter((_, i) => {
    return validImports[i]?.status === "fulfilled";
  });
};

const VERSIONS_DIR_PATH = join("src", "versions");

const COMPILED_AQUA_PATH = join(
  "src",
  "lib",
  "compiled-aqua",
  "installation-spell"
);

const INSTALLATION_SPELL_AQUA_DIR_PATH = join(
  "node_modules",
  "@fluencelabs",
  "installation-spell",
  "src",
  "aqua"
);

(async () => {
  try {
    await unlink(VERSIONS_DIR_PATH);
  } catch {}

  await mkdir(VERSIONS_DIR_PATH, { recursive: true });

  await cp("package.json", join(VERSIONS_DIR_PATH, "cli.package.json"));

  await cp(
    join("node_modules", "@fluencelabs", "js-client.node", "package.json"),
    join(VERSIONS_DIR_PATH, "js-client.package.json")
  );

  try {
    await unlink(COMPILED_AQUA_PATH);
  } catch {}

  await mkdir(COMPILED_AQUA_PATH, { recursive: true });

  await Promise.all(
    ["upload", "cli", "deal_spell", "files"].map(async (fileName) => {
      const compilationResult = await compile({
        filePath: join(
          INSTALLATION_SPELL_AQUA_DIR_PATH,
          `${fileName}.${AQUA_EXT}`
        ),
        imports: [
          join(
            "node_modules",
            ".pnpm",
            "@fluencelabs+aqua-lib@0.7.0",
            "node_modules"
          ),
          ...(await getAquaDependencyImports(
            join("@fluencelabs", "installation-spell")
          )),
        ],
        targetType: "ts",
      });

      const tsSource = compilationResult.generatedSources[0]?.tsSource;
      assert(typeof tsSource === "string");

      await writeFile(
        join(COMPILED_AQUA_PATH, `${fileName}.ts`),
        tsSource,
        FS_OPTIONS
      );
    })
  );
})().catch((e) => {
  return console.error(e);
});