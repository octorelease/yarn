/**
 * Copyright 2022 Octorelease Contributors
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

import * as fs from "fs";
import { IContext } from "@octorelease/core";
import { DEFAULT_NPM_REGISTRY, utils as npmUtils } from "@octorelease/npm";
import { IPluginConfig } from "./config";

export default async function (context: IContext, _config: IPluginConfig): Promise<void> {
    if (context.env.NPM_TOKEN == null) {
        throw new Error("Required environment variable NPM_TOKEN is undefined");
    }

    let publishConfig;
    try {
        const lernaJson = JSON.parse(fs.readFileSync("lerna.json", "utf-8"));
        context.version.new = lernaJson.version;
        publishConfig = lernaJson.publish;
    } catch {
        context.logger.warning(`Missing or invalid lerna.json in branch ${context.branch.name}`);
    }

    try {
        context.workspaces = JSON.parse(fs.readFileSync("package.json", "utf-8")).workspaces;
    } catch {
        context.logger.warning(`Missing or invalid package.json in branch ${context.branch.name}`);
    }

    context.branch.channel = context.branch.channel || "latest";
    await npmUtils.npmConfig(context, publishConfig?.registry || DEFAULT_NPM_REGISTRY);
}
