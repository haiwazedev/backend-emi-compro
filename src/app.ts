import 'dotenv/config';
import express, { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
  res.send({ message: 'OK' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
