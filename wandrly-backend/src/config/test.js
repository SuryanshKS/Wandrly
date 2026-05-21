import prisma from "../config/prisma.js";
import { getCoordinates } from "../utils/geocoder.js";

export const backfill = async () => {
  const trips = await prisma.trip.findMany({ where: { lat: null } });
  for (const trip of trips) {
    const { lat, lng } = await getCoordinates(trip.destination);
    await prisma.trip.update({
      where: { id: trip.id },
      data: { lat, lng }
    });
  }
};

backfill();