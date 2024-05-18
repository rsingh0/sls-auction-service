import { closeAuction } from "../helpers/closeAuction";
import { getEndedAuctions } from "../helpers/getEndedAuctions";

const processAuctions = async (event, context, callback) => {
  console.log("Processing Auctions as per scheduler ...");
  try {
    const endedAuctions = await getEndedAuctions();
    console.log("Ended Auctions", JSON.stringify(endedAuctions));

    const closedAuctions = endedAuctions.map((auction) =>
      closeAuction(auction)
    );
    const allClosedAuctions = await Promise.all(closedAuctions);

    console.log("All Closed Auctions", JSON.stringify(allClosedAuctions));
    return send(200, allClosedAuctions);
  } catch (error) {
    console.log(
      "Error While fetching ended auctions",
      JSON.stringify(error.message)
    );
    const response = {
      statusCode: 500,
      body: JSON.stringify(error.message),
    };
    return send(500, response);
  }
};

const send = (statusCode, response) => ({
  statusCode,
  body: JSON.stringify(response),
});

export const handler = processAuctions;
