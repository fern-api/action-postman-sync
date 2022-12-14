import * as PostmanParsing from "@fern-fern/postman-sdk/serialization";
import * as core from "@actions/core";
import { Collection, CollectionDefinition } from "postman-collection";
import { FernPostmanClient } from "@fern-fern/postman-sdk";
import { readFile } from "fs/promises";

void run();

async function run(): Promise<void> {
    try {
        const postmanApiKey = getStringInputOrThrow("api-key");
        const postmanWorkspaceId = getStringInputOrThrow("workspace-id");
        const postmanCollectionPath = getStringInputOrThrow("collection-path");

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
        core.debug(
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
        core.debug(
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
            core.debug(
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
            core.debug(
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

function getStringInputOrThrow(key: string): string {
    const input: unknown = core.getInput(key);
    if (input == null || isEmptyString(input)) {
        throw new Error(`${key} is not defined.`);
    }
    if (typeof input !== "string") {
        throw new Error(`${key} is not a string.`);
    }
    return input;
}

function isEmptyString(value: unknown): boolean {
    return typeof value === "string" && value.length === 0;
}
