import { getAuctionById } from "./getAuction";
import { uploadPictureToS3 } from "../helpers/uploadPictureToS3";
import { setAuctionPictureUrl } from "../helpers/setAuctionPictureUrl";

const uploadAuctionPicture = async (event, context, callback) => {
  try {
    const { id } = event.pathParameters;
    const { email } = event.requestContext.authorizer;
    const { auctionById, statusCode } = await getAuctionById(id);

    console.log("event.pathParameters", JSON.stringify(event.pathParameters));
    console.log("event.body", JSON.stringify(event.body));

    // Auction not found
    if (Object.keys(auctionById).length === 0 || statusCode === 500) {
      throw new Error(`No Auction Found for id ${id}`);
    }

    // Validate auction ownership
    if (Object.keys(auctionById).length !== 0 && auctionById.seller !== email) {
      throw new Error(`You are not the seller of this auction!`);
    }

    const base64 = event.body.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");
    console.log("buffer", buffer);

    const { Location } = await uploadPictureToS3(
      auctionById.id + ".jpg",
      buffer
    );
    console.log("Auction Picture URL from S3", Location);
    const updatedAuction = await setAuctionPictureUrl(auctionById.id, Location);

    const response = {
      message: `Auction updated with picture ${Location}`,
      data: updatedAuction,
    };
    callback(null, send(200, response));
  } catch (error) {
    console.log(`Error while uploading picture`, error);
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

export const handler = uploadAuctionPicture;
