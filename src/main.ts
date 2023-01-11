import * as PostmanParsing from "@fern-fern/postman-sdk/serialization";
import * as core from "@actions/core";
import { Collection, CollectionDefinition } from "postman-collection";
import { FernPostmanClient } from "@fern-fern/postman-sdk";
import { readFile } from "fs/promises";

async function run(): Promise<void> {
    try {
        const postmanApiKey: string = core.getInput("api-key");
        const postmanWorkspaceId: string = core.getInput("workspace-id");
        const postmanCollectionPath: string = core.getInput("collection-path");

        const rawPostmanCollection = JSON.parse(
            (await readFile(postmanCollectionPath)).toString()
        ) as PostmanParsing.PostmanCollectionSchema.Raw;
        const postmanCollection =
            PostmanParsing.PostmanCollectionSchema.parse(rawPostmanCollection);
        core.info(`Read collection from ${postmanCollectionPath}.`);

        const postmanClient = new FernPostmanClient({
            auth: {
                apiKey: postmanApiKey,
            },
        });

        const getWorkspaceResponse = await postmanClient.workspace.getWorkspace(
            {
                workspaceId: postmanWorkspaceId,
            }
        );
        core.info(
            `Received workspace: ${JSON.stringify(getWorkspaceResponse)}`
        );
        if (!getWorkspaceResponse.ok) {
            throw new Error(
                `Failed to load workspace: ${JSON.stringify(
                    getWorkspaceResponse.error
                )}`
            );
        }
        const workspaceName = getWorkspaceResponse.body.workspace.name;

        const collectionMetadataResponse =
            await postmanClient.collection.getAllCollectionMetadata({
                workspace: postmanWorkspaceId,
            });
        core.info(
            `Received collection metadata: ${JSON.stringify(
                collectionMetadataResponse
            )}`
        );
        if (!collectionMetadataResponse.ok) {
            throw new Error(
                `Failed to load collection metadata from workspace: ${JSON.stringify(
                    collectionMetadataResponse.error
                )}`
            );
        }

        const collectionMetadata =
            collectionMetadataResponse.body.collections.find(
                (collectionMetadataItem) =>
                    collectionMetadataItem.name === postmanCollection.info.name
            );
        const collectionDefinition: CollectionDefinition = {
            ...rawPostmanCollection,
            auth:
                postmanCollection.auth != null
                    ? postmanCollection.auth._visit({
                          basic: () => {
                              return { ...rawPostmanCollection.auth };
                          },
                          bearer: () => {
                              return { ...rawPostmanCollection.auth };
                          },
                          _other: () => undefined,
                      })
                    : undefined,
        };
        if (collectionMetadata != null) {
            const updateCollectionResponse =
                await postmanClient.collection.updateCollection({
                    collectionId: collectionMetadata.uid,
                    _body: {
                        collection: new Collection(collectionDefinition),
                    },
                });
            core.info(
                `Updated collection: ${JSON.stringify(
                    updateCollectionResponse
                )}`
            );
            if (!updateCollectionResponse.ok) {
                throw new Error(
                    `Failed to update collection in workspace ${
                        getWorkspaceResponse.body.workspace.name
                    }. 
                    ${JSON.stringify(
                        updateCollectionResponse.error,
                        undefined,
                        2
                    )}`
                );
            }
            core.info(
                `Successfully updated collection in workspace ${workspaceName}!`
            );
        } else {
            const createCollectionResponse =
                await postmanClient.collection.createCollection({
                    workspace: postmanWorkspaceId,
                    _body: {
                        collection: new Collection(collectionDefinition),
                    },
                });
            core.info(
                `Created collection: ${JSON.stringify(
                    createCollectionResponse
                )}`
            );
            if (!createCollectionResponse.ok) {
                throw new Error(
                    `Failed to create collection in workspace ${workspaceName}. 
                    ${JSON.stringify(
                        createCollectionResponse.error,
                        undefined,
                        2
                    )}`
                );
            }
            core.info(
                `Successfully created collection in workspace ${workspaceName}!`
            );
        }
    } catch (error) {
        if (error instanceof Error) core.setFailed(error.message);
    }
}

run();
