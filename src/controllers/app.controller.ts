import { Request, Response } from "express";



export const getIndex = async (req: Request, res: Response) => {
    res.json({ message: "Welcome to Novunt API" });
    };