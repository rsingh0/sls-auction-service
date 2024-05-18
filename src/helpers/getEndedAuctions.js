import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";

const DBClient = new DynamoDBClient({
  region: "us-east-2",
  // To fix DynamoDB timeouts as API-Gateway returns timeout in 29 secs
  // https://seed.run/blog/how-to-fix-dynamodb-timeouts-in-serverless-application.html
  httpOptions: {
    timeout: 5000,
  },
  maxRetries: 3, // by default 10 times
});
const AUCTIONS_TABLE_NAME = process.env.AUCTIONS_TABLE_NAME;

export async function getEndedAuctions() {
  const now = new Date();

  // I think, This is what marshall() was doing
  const statusAndEndDate = {
    status: { S: "OPEN" },
    endingAt: { S: now.toISOString() },
  };
  const params = {
    TableName: AUCTIONS_TABLE_NAME,
    IndexName: "StatusAndEndDate",
    KeyConditionExpression: "#status = :status AND #endingAt <= :endingAt",
    ExpressionAttributeNames: { "#status": "status", "#endingAt": "endingAt" },
    ExpressionAttributeValues: {
      ":status": statusAndEndDate.status,
      ":endingAt": statusAndEndDate.endingAt,
    },
  };

  console.log(`Fetch Ended Auction before ${now.toISOString()}`);
  const { Items } = await DBClient.send(new QueryCommand(params));
  console.log(`Ended Auction before ${now.toISOString()} ${Items}`);
  return Items;
}
