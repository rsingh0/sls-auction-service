import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getAuctionById } from "./getAuction";

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

const AUCTIONS_TABLE_NAME = process.env.AUCTIONS_TABLE_NAME;

const placeBid = async (event, context, callback) => {
  // Optimization
  // This flag is to avoid latency happened due to processing promises and callback by Node Event Loop FW
  context.callbackWaitsForEmptyEventLoop = false;

  const { id } = event.pathParameters;
  const { amount } = JSON.parse(event.body);
  const { email } = event.requestContext.authorizer;

  try {
    const { auctionById, statusCode } = await getAuctionById(id);

    //FIXME: Validation error staus code should be 403 forbidden

    // Auction not found
    if (statusCode === 500) {
      throw new Error(`No Auction Found for id ${id}`);
    }

    // Bid amount validation
    if (
      Object.keys(auctionById).length !== 0 &&
      auctionById.highestBid &&
      amount < auctionById.highestBid.amount
    ) {
      throw new Error(
        `Your Bid must be higher than ${auctionById.highestBid.amount}`
      );
    }

    // Auction status validation (CLOSED)
    if (
      Object.keys(auctionById).length !== 0 &&
      auctionById.status === "CLOSED"
    ) {
      throw new Error(`You cannot bid on closed auction!`);
    }

    // Avoid double bidding
    if(email === auctionById.seller){
      throw new Error(`You cannot bid on your own auction!`);
    }

    // Auction status validation
    if(email === auctionById.highestBid.bidder){
      throw new Error(`You are already the highest bidder!`);
    }

    const params = {
      TableName: AUCTIONS_TABLE_NAME,
      Key: { id },
      UpdateExpression:
        "set highestBid.amount = :amount, highestBid.bidder = :bidder",
      ExpressionAttributeValues: {
        ":amount": amount,
        ":bidder": email,
      },
      ReturnValues: "ALL_NEW",
    };

    console.log(`Update Auction by ${id} with Bid amount ${amount}`);
    console.log(`Update Param# ${JSON.stringify(params)}`);

    const result = await docClient.send(new UpdateCommand(params));
    const response = {
      message: "Auction updated successfully.",
      data: result,
    };
    console.log(`Updated Auction ${JSON.stringify(result)}`);
    callback(null, send(200, response));
  } catch (error) {
    console.log(` Error while updating an auction ${error}`);
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

export const handler = placeBid;
