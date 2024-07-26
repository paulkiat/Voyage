import express from 'express';
import { Request, Response } from 'express';
import { createAccessToken, jwtRequired } from './authMiddleware';

const app = express();
app.use(express.json());

app.post('/login', (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (username !== 'test' || password !== 'test') {
        return res.status(401).json({ msg: 'Bad username or password' });
    }

    const accessToken = createAccessToken(username);
    return res.json({ accessToken });
});

app.post('/recommend', jwtRequired, (req: Request, res: Response) => {
    const userPreferences = req.body;
    const recommendedItinerary = generateItinerary(userPreferences);
    return res.json(recommendedItinerary);
});

function generateItinerary(preferences: any): any {
    // todo: Implement your itinerary generation logic here
    return {};
}

app.listen(5000, () => {
    console.log('Server running on port 5000');
});