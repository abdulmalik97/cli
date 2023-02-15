/**
 * Copyright 2022 Fluence Labs Limited
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

import type { JSONSchemaType } from "ajv";

import { DEPLOYED_CONFIG_FILE_NAME, TOP_LEVEL_SCHEMA_ID } from "../../const.js";
import { ensureFluenceDir } from "../../paths.js";
import {
  InitConfigOptions,
  InitializedConfig,
  InitializedReadonlyConfig,
  getReadonlyConfigInitFunction,
  Migrations,
  GetDefaultConfig,
} from "../initConfig.js";

type ConfigV0 = {
  version: 0;
  workers: {
    installation_spells: {
      host_id: string;
      spell_id: string;
      worker_id: string;
    }[];
    name: string;
  }[];
};

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  $id: `${TOP_LEVEL_SCHEMA_ID}/${DEPLOYED_CONFIG_FILE_NAME}`,
  title: DEPLOYED_CONFIG_FILE_NAME,
  type: "object",
  description:
    "A result of app deployment. This file is created automatically after successful deployment using `fluence workers deploy` command",
  properties: {
    version: { type: "number", const: 0 },
    workers: {
      type: "array",
      description: "A list of deployed workers",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          installation_spells: {
            type: "array",
            description: "A list of installation spells",
            items: {
              type: "object",
              properties: {
                host_id: { type: "string" },
                spell_id: { type: "string" },
                worker_id: { type: "string" },
              },
              required: ["host_id", "spell_id", "worker_id"],
            },
          },
        },
        required: ["name", "installation_spells"],
      },
    },
  },
  required: ["version"],
};

const migrations: Migrations<Config> = [];

type Config = ConfigV0;
type LatestConfig = ConfigV0;
export type DeployedConfig = InitializedConfig<LatestConfig>;
export type DeployedConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

const initConfigOptions: InitConfigOptions<Config, LatestConfig> = {
  allSchemas: [configSchemaV0],
  latestSchema: configSchemaV0,
  migrations,
  name: DEPLOYED_CONFIG_FILE_NAME,
  getConfigDirPath: ensureFluenceDir,
};

export const initReadonlyProjectSecretsConfig =
  getReadonlyConfigInitFunction(initConfigOptions);

export const initNewReadonlyProjectSecretsConfig = (
  config: Omit<LatestConfig, "version">
): Promise<DeployedConfigReadonly> => {
  const getDefault: GetDefaultConfig<LatestConfig> = () => ({
    version: 0,
    ...config,
  });

  return getReadonlyConfigInitFunction(initConfigOptions, getDefault)();
};

export const deployedSchema: JSONSchemaType<LatestConfig> = configSchemaV0;