import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
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
const AUCTIONS_TABLE_NAME = process.env.AUCTIONS_TABLE_NAME;

const getAuctions_Scan_Legacy = async (event, context, callback) => {
  // Optimization
  // This flag is to avoid latency happened due to processing promises and callback by Node Event Loop FW
  context.callbackWaitsForEmptyEventLoop = false;

  let allAuctions = [];
  let exclusiveStartKey = undefined;
  const scanFailedMessage = undefined;

  do {
    const params = {
      TableName: AUCTIONS_TABLE_NAME,
      ExclusiveStartKey: exclusiveStartKey,
    };

    console.log(`Fetching Auction with params ${JSON.stringify(params)}`);

    const scanCommand = new ScanCommand(params);

    try {
      const response = await DBClient.send(scanCommand);
      console.log(`Fetched Auction ${JSON.stringify(response)}`);
      allAuctions.push(...response.Items);
      exclusiveStartKey = response.LastEvaluatedKey;
    } catch (error) {
      console.error("Error scanning Auctions table:", error);
      scanFailedMessage = error.message;
      break;
    }
  } while (exclusiveStartKey);

  if (scanFailedMessage) {
    const response = {
      statusCode: 500,
      body: JSON.stringify(scanFailedMessage),
    };
    callback(null, send(500, response));
  } else {
    const response = {
      message: "Fetched Auctions",
      data: allAuctions,
    };
    console.log(`New Auction ${JSON.stringify(response)}`);
    callback(null, send(200, response));
  }
};

const send = (statusCode, response) => ({
  statusCode,
  body: JSON.stringify(response),
});

export const handler = getAuctions_Scan_Legacy;
