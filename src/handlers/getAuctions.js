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

const getAuctions = async (event, context, callback) => {
  // Optimization
  // This flag is to avoid latency happened due to processing promises and callback by Node Event Loop FW
  context.callbackWaitsForEmptyEventLoop = false;

  const { status } = event.queryStringParameters;

  const params = {
    TableName: AUCTIONS_TABLE_NAME,
    IndexName: "StatusAndEndDate",
    KeyConditionExpression: "#status = :status",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":status": { S: status },
    },
  };

  console.log(`Fetching All Auction with params ${JSON.stringify(params)}`);

  try {
    const {Items} = await DBClient.send(new QueryCommand(params));
    console.log(`Fetched Auction ${JSON.stringify(Items)}`);
    const response = {
      message: "Fetched Auctions",
      data: Items,
    };
    console.log(`All Fetched Auction ${JSON.stringify(response)}`);
    callback(null, send(200, response));
  } catch (error) {
    console.error("Error quering Auctions table:", error);
    const response = {
      statusCode: 500,
      body: JSON.stringify(error.message),
    };
    callback(null, send(500, response));
  }
};

const send = (statusCode, response) => ({
  statusCode,
  body: JSON.stringify(response),
});

export const handler = getAuctions;
