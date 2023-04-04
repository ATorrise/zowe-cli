/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*
*/

import { AbstractSession, IHandlerParameters, ImperativeError, ITaskWithStatus, TaskStage, TextUtils } from "@zowe/imperative";
import { Download, IZosFilesResponse } from "@zowe/zos-files-for-zowe-sdk";
import { tmpdir } from "os";
import { ZosFilesBaseHandler } from "../../ZosFilesBase.handler";
import { EditUtilities, Prompt, LocalFile } from "../Edit.utils";

/**
 * Handler to edit a data set's content
 * @export
 */
export default class DatasetHandler extends ZosFilesBaseHandler {
    public async processWithSession(commandParameters: IHandlerParameters, session: AbstractSession): Promise<IZosFilesResponse> {
        // Setup
        const Utils = EditUtilities;
        let lfFile = new LocalFile;
        const lfDir = await Utils.buildTmpDir(commandParameters);
        commandParameters.arguments.localFilePath = lfDir;

        // Use or override stash (either way need to retrieve etag)
        const stash: boolean = await Utils.checkForStash(lfDir);
        let overrideStash: boolean = false;

        if (stash) {
            overrideStash = await Utils.promptUser(Prompt.useStash);
        }
        try{
            const task: ITaskWithStatus = {
                percentComplete: 10,
                statusMessage: "Finding mainframe data set",
                stageName: TaskStage.IN_PROGRESS
            };
            commandParameters.response.progress.startBar({task});

            if (overrideStash || !stash) {
                lfFile.zosResp = await Download.dataSet(session, commandParameters.arguments.dataSetName, {returnEtag: true, file: lfDir});
            }else{
                // Show difference between your lf and mfFile
                Utils.fileComparison(session, commandParameters);
                // Download just to get etag. Don't overwrite prexisting file (stash) during process // etag = zosResp.apiResponse.etag
                lfFile.zosResp = await Download.dalfFile.apiResponsetaSet(session, commandParameters.arguments.dataSetName,
                    {returnEtag: true, file: tmpdir()+'toDelete'});
                Utils.destroyTempFile((tmpdir()+'toDelete'));
            }
            task.percentComplete = 70;
            task.stageName = TaskStage.COMPLETE;
        }catch(error){
            throw new ImperativeError({
                msg: TextUtils.chalk.red(`File not found on mainframe. Command terminate`),
                causeErrors: error
            });
        }

        // Edit local copy of mf file
        await Utils.makeEdits(session, commandParameters);

        // Once done editing, user will provide terminal input. Upload local file with saved etag
        let uploaded = await Utils.uploadEdits(session, commandParameters, lfDir, lfFile);
        while (!uploaded) {
            uploaded = await Utils.uploadEdits(session, commandParameters, lfDir, lfFile);
        }

        return {
            success: true,
            commandResponse: TextUtils.chalk.green(
                "Successfully uploaded edited file to mainframe"
            ),
            apiResponse: {}//return IZosFilesResponse here and pertinent file deets
        };
    }
}