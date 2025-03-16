import { Icon } from '@iconify/react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface Article {
    date: string;
    error?: string;
    link: string;
    source: string;
    success: boolean;
    title: string;
    summary?: string;
    health_impact?: string;
    sentiment?: {
        confidence: number;
        label: string;
    };
}

interface HealthNewsResponse {
    articles: Article[];
    count: number;
    success: boolean;
    timestamp: string;
}

// Fallback example data
const EXAMPLE_DATA: HealthNewsResponse = {
    articles: [
        {
            date: "Thu, 13 Mar 2025 18:04:52 EDT",
            health_impact: "This news has neutral or mixed health implications.",
            link: "https://www.sciencedaily.com/releases/2025/03/250313180452.htm",
            sentiment: {
                confidence: 0.5,
                label: "NEUTRAL"
            },
            source: "ScienceDaily Health",
            success: true,
            summary: "Here is a concise summary of the article:\n\nResearchers from the University of Pennsylvania found that people who were exposed to seasonal flu viruses before 1968 have a higher likelihood of having antibodies that can bind to the H5N1 avian flu virus. This suggests that older adults may have some level of protection against H5N1, while younger adults and children may benefit more from H5N1 vaccines. The study also found that children who were not exposed to seasonal flu viruses have low levels of antibodies that can fight H5N1, and prioritizing children for H5N1 vaccinations may be important in the event of a pandemic.",
            title: "Older adults might be more resistant to bird flu infections than children"
        },
        {
            date: "Thu, 13 Mar 2025 15:20:04 EDT",
            health_impact: "This news has neutral or mixed health implications.",
            link: "https://www.sciencedaily.com/releases/2025/03/250313152004.htm",
            sentiment: {
                confidence: 0.5,
                label: "NEUTRAL"
            },
            source: "ScienceDaily Health",
            success: true,
            summary: "Here is a concise summary of the article:\n\nResearchers at Weill Cornell Medicine have discovered that a person's \"bioenergetic age\" - a measure of how efficiently their cells generate energy - may be a key indicator of their risk of developing Alzheimer's disease. The study found that individuals with a lower bioenergetic age, which can be influenced by lifestyle factors such as diet and exercise, may be less likely to develop Alzheimer's. The researchers also identified a subgroup of individuals with an older bioenergetic age but favorable genetic background, who may benefit from early lifestyle interventions to delay or prevent the onset of Alzheimer's.",
            title: "Lowering bioenergetic age may help fend off Alzheimer's"
        }
    ],
    count: 2,
    success: true,
    timestamp: "2025-03-16T04:59:50.288519"
};

const HealthNews = () => {
    const { data: apiData, isLoading, error } = useQuery<HealthNewsResponse>({
        queryKey: ['health-news'],
        queryFn: async () => {
            const response = await axios.get('https://46b6-34-147-94-58.ngrok-free.app/health-news');
            return response.data;
        },
    });

    // Use API data if available, otherwise use example data
    const data = apiData?.articles?.length ? apiData : EXAMPLE_DATA;
    // Filter articles to show only those with summaries
    const articles = data.articles.filter(article => article.summary && article.success);
    const timestamp = data.timestamp;

    if (isLoading) {
        return (
            <main className="dashboard-main">
                <div className="dashboard-main-body">
                    <div className="flex justify-center items-center min-h-screen">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="dashboard-main">
            <div className="navbar-header border-b border-neutral-200 dark:border-neutral-600">
                <div className="flex items-center justify-between">
                    <div className="col-auto">
                        <div className="flex flex-wrap items-center gap-[16px]">
                            <button type="button" className="sidebar-toggle">
                                <Icon icon="heroicons:bars-3-solid" className="icon non-active" />
                                <Icon icon="iconoir:arrow-right" className="icon active" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="dashboard-main-body">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
                    <h6 className="font-semibold mb-0 dark:text-white">Latest Health News</h6>
                    <div className="flex items-center gap-2">
                        {error && (
                            <span className="text-sm text-amber-500">
                                Using example data (API unavailable)
                            </span>
                        )}
                        <div className="text-sm text-neutral-500">
                            Last updated: {new Date(timestamp).toLocaleString()}
                        </div>
                    </div>
                </div>
                <div className="grid gap-6">
                    {articles.map((article, index) => (
                        <div key={index} className="card p-6 bg-white dark:bg-neutral-800 rounded-lg shadow-sm">
                            <div className="flex flex-col gap-4">
                                <div className="flex items-start justify-between">
                                    <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                                        {article.title}
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        {article.sentiment && (
                                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                                                article.sentiment.label === 'NEUTRAL' 
                                                    ? 'bg-blue-100 text-blue-700' 
                                                    : article.sentiment.label === 'POSITIVE'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-700'
                                            }`}>
                                                {article.sentiment.label}
                                            </span>
                                        )}
                                        <span className="px-3 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
                                            {article.source}
                                        </span>
                                    </div>
                                </div>
                                {article.health_impact && (
                                    <p className="text-sm text-neutral-600 dark:text-neutral-400 italic">
                                        {article.health_impact}
                                    </p>
                                )}
                                <div className="bg-neutral-50 dark:bg-neutral-700 p-4 rounded-lg">
                                    <h3 className="text-sm font-semibold mb-2 text-neutral-900 dark:text-white">
                                        Summary
                                    </h3>
                                    <p className="text-sm text-neutral-600 dark:text-neutral-300">
                                        {article.summary}
                                    </p>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-neutral-500">
                                        {new Date(article.date).toLocaleDateString(undefined, {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </span>
                                    <a
                                        href={article.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                                    >
                                        Read More
                                        <Icon icon="heroicons:arrow-right-20-solid" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
};

export default HealthNews; 