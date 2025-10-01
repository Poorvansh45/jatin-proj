import { useState } from "react";

interface HelpRequest {
  _id: string;
  title: string;
  description: string;
  category: {
    _id: string;
    name: string;
    description: string;
    icon: string;
  };
  requester: {
    _id: string;
    name: string;
    email: string;
    picture?: string;
  };
  urgency: "low" | "medium" | "high";
  estimatedDuration?: string;
  location?: string;
  isRemote: boolean;
  budgetMin?: number;
  budgetMax?: number;
  status: "open" | "in_progress" | "completed";
  createdAt: string;
}

interface RequestFeedProps {
  requests: HelpRequest[];
  onAcceptRequest: (request: HelpRequest) => void;
}

const RequestFeed = ({ requests, onAcceptRequest }: RequestFeedProps) => {
  const [filter, setFilter] = useState("");

  const filteredRequests = requests.filter(
    (request) =>
      request.title.toLowerCase().includes(filter.toLowerCase()) ||
      request.description.toLowerCase().includes(filter.toLowerCase()) ||
      request.category.name.toLowerCase().includes(filter.toLowerCase())
  );

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <section id="requests" className="py-16 bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            Live Help Requests
          </h2>
          <p className="text-slate-300 text-lg">
            Connect with peers who need your expertise
          </p>
        </div>

        {/* Search Filter */}
        <div className="max-w-md mx-auto mb-8">
          <input
            type="text"
            placeholder="Search by subject or keyword..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
          />
        </div>

        {/* Requests Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRequests.length > 0 ? (
            filteredRequests.map((request) => (
              <div
                key={request._id}
                className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-cyan-400/50 transition-all duration-300 transform hover:scale-105">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full flex items-center justify-center text-white font-semibold">
                      {request.requester.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">
                        {request.requester.name}
                      </h3>
                      <p className="text-sm text-slate-400">
                        {formatTimeAgo(new Date(request.createdAt))}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="inline-block bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-full text-sm font-medium mb-3">
                    {request.category.name}
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {request.description}
                  </p>
                </div>

                <button
                  onClick={() => onAcceptRequest(request)}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold py-2 px-4 rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200 flex items-center justify-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Accept Request
                </button>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <div className="text-slate-400 text-lg">
                {filter
                  ? "No requests match your search"
                  : "No help requests at the moment"}
              </div>
              <p className="text-slate-500 mt-2">
                {filter
                  ? "Try adjusting your search terms"
                  : "Check back later or submit your own request!"}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default RequestFeed;
