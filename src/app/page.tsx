import HomePage from "@/components/landing/HomePage";
import { getFeaturedRestaurants, fetchPublicStats } from "@/lib/landing";

export default async function Home() {
    const [stats, featuredRestaurants] = await Promise.all([
        fetchPublicStats(),
        getFeaturedRestaurants(),
    ]);

    return <HomePage stats={stats} featuredRestaurants={featuredRestaurants} />;
}
