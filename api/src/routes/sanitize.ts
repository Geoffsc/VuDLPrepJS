import { Request, Response } from "express";

interface NextFunction {
    (err?: Error): void;
}

export function sanitizeParameters(customRules = {}, defaultRule = /^[-.a-zA-Z0-9_]+$/) {
    return function (req: Request, res: Response, next: NextFunction): void {
        for (const x in req.params) {
            if (!req.params[x].match(customRules[x] ?? defaultRule)) {
                return res.status(400).json({ error: "invalid: " + x });
            }
        }
        next();
    };
}
