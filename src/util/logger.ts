import { createLogger, format, transports } from "winston";
import DailyRotateFile = require("winston-daily-rotate-file");

var transport = new DailyRotateFile({
    dirname: 'logs',
    filename: 'mixbans-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '1g',
    maxFiles: '30d'
})

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
    ),
    defaultMeta: { service: 'mixbans' },
    transports: [
        transport
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({
        format: format.combine(
            format.colorize(),
            format.simple()
        )
    }));
}

export { logger };