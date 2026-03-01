import { Router, Request, Response } from "express";
import { identifyContact } from "../services/identifyService";

const router = Router();

router.post("/identify", async (req: Request, res: Response) => {
  try {
    const { email, phoneNumber } = req.body;

    // Basic validation: at least one must be present
    if (
      (email === undefined || email === null) &&
      (phoneNumber === undefined || phoneNumber === null)
    ) {
      return res.status(400).json({
        error: "At least one of 'email' or 'phoneNumber' must be provided.",
      });
    }

    const result = await identifyContact({ email, phoneNumber });
    return res.status(200).json(result);
  } catch (error: unknown) {
    console.error("Error in /identify:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return res.status(500).json({ error: message });
  }
});

export default router;
