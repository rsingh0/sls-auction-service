import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import AWS from "aws-sdk";

const sqs = new AWS.SQS({ region: "us-east-2" });

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

export async function closeAuction(auction) {
  const sanitizedAuction = unmarshall(auction);
  console.log(`Unmarshalled Auction for ${JSON.stringify(sanitizedAuction)}`);
  const { id } = sanitizedAuction;

  const docParams = {
    TableName: AUCTIONS_TABLE_NAME,
    Key: { id },
    UpdateExpression: "set #status = :status",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":status": "CLOSED",
    },
    ReturnValues: "ALL_NEW",
  };

  console.log(`Closing Auction for ${id}`);
  const result = await docClient.send(new UpdateCommand(docParams));
  console.log(`Auction Closed ${JSON.stringify(result)}`);

  const { title, seller, highestBid } = sanitizedAuction;
  const { amount, bidder } = highestBid;

  const subject =
    amount === 0 ? "No Bids to your auction :(" : "Your item has been sold!";
  const body =
    amount === 0
      ? `Oh no! Your item ${title} didn't get any bid. Better luck next time`
      : `Woohoo! Your item ${title} has been sold for ${amount} bid by ${bidder}`;

  // Inform (Send Mail via SQS) the seller that his item is sold and Auction is closed.
  const sellerSQSParams = {
    MessageBody: JSON.stringify({
      subject,
      body,
      recipient: seller,
    }),
    QueueUrl: process.env.MAIL_QUEUE_URL,
  };
  const sellerSQSResponse = await sqs.sendMessage(sellerSQSParams).promise();
  console.log(
    `Message successfully sent to queue for seller: ${seller}`,
    JSON.stringify(sellerSQSResponse)
  );

  if (amount > 0) {
    // Inform (Send Mail via SQS) the bidder that he won the bid and Auction is closed.
    const bidderSQSParams = {
      MessageBody: JSON.stringify({
        subject: "You won an auction!",
        body: `What a great deal! you got yourself a ${title} for ${amount}`,
        recipient: bidder,
      }),
      QueueUrl: process.env.MAIL_QUEUE_URL,
    };
    const bidderSQSResponse = await sqs.sendMessage(bidderSQSParams).promise();
    console.log(
      `Message successfully sent to queue for bidder: ${bidder}`,
      JSON.stringify(bidderSQSResponse)
    );
  }
}
