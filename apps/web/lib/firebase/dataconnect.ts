import { getDataConnect } from "firebase/data-connect";
import { connectorConfig } from "@lib/generated";

export const dc = getDataConnect(connectorConfig);
