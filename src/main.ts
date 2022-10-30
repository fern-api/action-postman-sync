import * as core from "@actions/core";
import { Collection, CollectionDefinition } from "postman-collection";
import { FernPostmanClient } from "@fern-fern/postman-sdk";
import { PostmanCollectionSchema } from "@fern-fern/postman-sdk/resources";
import { readFile } from "fs/promises";

async function run(): Promise<void> {
    try {
        const postmanApiKey: string = core.getInput("api-key");
        const postmanWorkspaceId: string = core.getInput("workspace-id");
        const postmanCollectionPath: string = core.getInput("collection-path");

        const postmanCollection = JSON.parse(
            (await readFile(postmanCollectionPath)).toString()
        ) as PostmanCollectionSchema;

        const postmanClient = new FernPostmanClient({
            auth: {
                apiKey: postmanApiKey,
            },
        });
        const collectionMetadataResponse =
            await postmanClient.collection.getAllCollectionMetadata({
                workspace: postmanWorkspaceId,
            });
        if (!collectionMetadataResponse.ok) {
            throw new Error(
                `Failed to load collection metadata: ${collectionMetadataResponse.error}`
            );
        }
        const collectionMetadata =
            collectionMetadataResponse.body.collections.find(
                (collectionMetadataItem) => {
                    collectionMetadataItem.name === postmanCollection.info.name;
                }
            );
        const collectionDefinition: CollectionDefinition = {
            ...postmanCollection,
            auth:
                postmanCollection.auth != null
                    ? postmanCollection.auth._visit({
                          basic: () => {
                              return { ...postmanCollection.auth };
                          },
                          bearer: () => {
                              return { ...postmanCollection.auth };
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
            if (!updateCollectionResponse.ok) {
                throw new Error(
                    `Failed to update collection: ${updateCollectionResponse.error}`
                );
            }
            core.info(`Successfully updated collection!`);
        } else {
            const createCollectionResponse =
                await postmanClient.collection.createCollection({
                    workspace: postmanWorkspaceId,
                    _body: {
                        collection: new Collection(collectionDefinition),
                    },
                });
            if (!createCollectionResponse.ok) {
                throw new Error(
                    `Failed to create collection: ${createCollectionResponse.error}`
                );
            }
            core.info(`Successfully created collection!`);
        }
    } catch (error) {
        if (error instanceof Error) core.setFailed(error.message);
    }
}

run();
