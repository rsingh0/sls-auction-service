import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

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

export async function getAuctionById(id){
  let response = {}
  let statusCode = 200;
  let auctionById = {}
  try {
    const params = {
      TableName: AUCTIONS_TABLE_NAME,
      Key: marshall({ id }),
    };

    console.log(`Fetch Auction by ${id}`);
    const { Item } = await DBClient.send(new GetItemCommand(params));

    if(!Item){
      throw new Error(`No Auction Found for id ${id}`);
    }

    auctionById = Item ? unmarshall(Item) : {}
    response = {
      message: "Auction fetched successfully.",
      data: auctionById,
    };
    console.log(`Fetched Auction ${JSON.stringify(response)}`);

  } catch (error) {
    console.log(` Error while fetching an auction ${error}`);
    response = {
      statusCode: 500,
      body: JSON.stringify(error.message),
    };
    statusCode = 500;
  }
  return { response, statusCode, auctionById };
}

const getAuction = async (event, context, callback) => {
  // Optimization
  // This flag is to avoid latency happened due to processing promises and callback by Node Event Loop FW
  context.callbackWaitsForEmptyEventLoop = false;

  const { id } = event.pathParameters;
  const { response, statusCode } = await getAuctionById(id);

  callback(null, send(statusCode, response));
};

const send = (statusCode, response) => ({
  statusCode,
  body: JSON.stringify(response),
});

export const handler = getAuction;


