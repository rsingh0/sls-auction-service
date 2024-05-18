import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const DBClient = new DynamoDBClient({
  region: "us-east-2",
  // To fix DynamoDB timeouts as API-Gateway returns timeout in 29 secs
  // https://seed.run/blog/how-to-fix-dynamodb-timeouts-in-serverless-application.html
  httpOptions: {
    timeout: 5000,
  },
  maxRetries: 3, // by default 10 times
});
const docClient = DynamoDBDocumentClient.from(DBClient);

export async function setAuctionPictureUrl(id, pictureUrl) {
  //const unmarshalledID = unmarshall(id);
  //const unmarshalledURL = unmarshall(pictureUrl);

  console.log('setAuctionPictureUrl::id', id)
  console.log('setAuctionPictureUrl::pictureUrl', pictureUrl)

  const params = {
    TableName: process.env.AUCTIONS_TABLE_NAME,
    Key: { id },
    UpdateExpression: "set pictureUrl = :pictureUrl",
    ExpressionAttributeValues: {
      ":pictureUrl": pictureUrl,
    },
    ReturnValues: "ALL_NEW",
  };

  console.log(
    `Updating picture URL for ${id} and URL ${pictureUrl}`
  );
  const result = await docClient.send(new UpdateCommand(params));
  console.log(`Picture URL updated ${JSON.stringify(result)}`);
  return result.Attributes;
}
