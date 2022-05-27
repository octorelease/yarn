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

import * as exec from "@actions/exec";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { IWorkspaceInfo } from "@octorelease/core";

export async function getWorkspaceInfo(): Promise<IWorkspaceInfo[]> {
    const workspaces = [];
    for (const [name, info] of Object.entries(await yarnList())) {
        const displayName = JSON.parse(readFileSync(join(info.location, "package.json"), "utf-8")).displayName;
        workspaces.push({name:  displayName ?? name, path: info.location});
    }
    return workspaces;
}

export async function yarnList(): Promise<Record<string, any>> {
    const cmdOutput = await exec.getExecOutput("npx", ["yarn", "workspaces", "list", "--json"]);
    const lines = cmdOutput.stdout.split(/\r?\n/);
    if (lines[0].indexOf("yarn") >= 0) lines.splice(0, 1);
    if (lines[lines.length - 1].indexOf("Done") >= 0) lines.pop();
    return JSON.parse(lines.join());
}

export async function yarnPretty(): Promise<void> {
    if (JSON.parse(readFileSync("package.json", "utf-8")).scripts?.pretty)
        await exec.exec("npx", ["yarn", "pretty"]);
}

export async function yarnVersion(newVersion: string): Promise<void> {
    const dependencyList = ["dependencies", "devDependencies", "peerDependencies", "bundledDependencies", "optionalDependencies", "overrides"];
    const topPackageJson = JSON.parse(readFileSync("package.json", "utf-8"));

    if (topPackageJson.workspaces) {
        // TODO: Figure out if the order matters
        for (const info of Object.values(await yarnList())) {
            const packagePath = join(info.location, "package.json");
            const packageJson = JSON.parse(readFileSync(packagePath, "utf-8"));
            packageJson.version = newVersion;

            // Update every workspace dependency in the dependencyList
            for (const dep of info.workspaceDependencies) {
                const foundInList = dependencyList.filter(d => packageJson[d][dep] != null);

                for (const list of foundInList) {
                    packageJson[list][dep] = newVersion;
                }
            }
            writeFileSync(packagePath, JSON.stringify(packageJson));
        }
    }

    topPackageJson.version = newVersion;
    writeFileSync("package.json", JSON.stringify(topPackageJson));

    await yarnPretty();
}
