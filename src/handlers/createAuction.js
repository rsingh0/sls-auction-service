import { uuid } from "uuidv4";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";

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

const createAuction = async (event, context, callback) => {
  // Optimization
  // This flag is to avoid latency happened due to processing promises and callback by Node Event Loop FW
  context.callbackWaitsForEmptyEventLoop = false;

  const { title } = JSON.parse(event.body);
  const { email } = event.requestContext.authorizer;
  const now = new Date();
  const endDate = new Date();
  endDate.setHours(now.getHours() + 1);

  try {
    const auction = {
      id: uuid(),
      title,
      status: "OPEN",
      highestBid: {
        amount: 0,
      },
      seller: email,
      createdAt: now.toISOString(),
      endingAt: endDate.toISOString(),
    };

    const params = {
      TableName: AUCTIONS_TABLE_NAME,
      Item: marshall(auction),
      ConditionExpression: "attribute_not_exists(id)",
    };

    console.log(
      `Creating Auction ${auction.id} with params ${JSON.stringify(auction)}`
    );
    const result = await DBClient.send(new PutItemCommand(params));
    const response = {
      message: "New Auction created successfully.",
      data: result,
    };
    console.log(`New Auction ${JSON.stringify(result)}`);
    callback(null, send(201, response));
  } catch (error) {
    console.log(` Error while creating an auction ${error}`);
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

export const handler = createAuction;
