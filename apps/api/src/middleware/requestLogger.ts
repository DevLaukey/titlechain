import morgan from "morgan";
import { config } from "../config";

// Use concise format in development, combined in production
const format = config.isProduction ? "combined" : "dev";

export const requestLogger = morgan(format);
