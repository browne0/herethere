import { Sparkles, UtensilsCrossed, Map, Clock, Share2, Palette } from 'lucide-react';

interface FeatureCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  gradient: string;
}

const FeatureCard = ({ icon: Icon, title, description, gradient }: FeatureCardProps) => {
  return (
    <div className="group relative overflow-hidden p-8 rounded-2xl bg-white hover:bg-gray-50 transition-all duration-300 shadow-md hover:shadow-xl">
      {/* Gradient circle background */}
      <div
        className={`absolute -right-8 -top-8 w-24 h-24 rounded-full opacity-10 transition-transform duration-300 group-hover:scale-150 ${gradient}`}
      />

      {/* Icon */}
      <div className="relative mb-4">
        <div className="inline-flex items-center justify-center p-3 rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-all duration-300">
          <Icon className="w-6 h-6" />
        </div>
      </div>

      {/* Content */}
      <h3 className="text-xl font-semibold mb-2 text-gray-900">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
};

export function Features() {
  const features = [
    {
      icon: Sparkles,
      title: 'AI-Powered Planning',
      description:
        'Our intelligent system creates perfect itineraries based on your preferences, ensuring every moment of your trip is optimized.',
      gradient: 'bg-gradient-to-br from-purple-400 to-indigo-600',
    },
    {
      icon: UtensilsCrossed,
      title: 'Dietary Conscious',
      description:
        'Never worry about finding suitable restaurants. We curate dining options matching your dietary requirements and preferences.',
      gradient: 'bg-gradient-to-br from-green-400 to-emerald-600',
    },
    {
      icon: Map,
      title: 'Smart Location Mapping',
      description:
        'Efficiently planned routes with carefully timed activities, making the most of your travel time and location.',
      gradient: 'bg-gradient-to-br from-blue-400 to-cyan-600',
    },
    {
      icon: Clock,
      title: 'Real-time Updates',
      description:
        'Stay informed with live updates about restaurant availability, opening hours, and local events during your trip.',
      gradient: 'bg-gradient-to-br from-orange-400 to-red-600',
    },
    {
      icon: Share2,
      title: 'Collaborative Planning',
      description:
        'Share and plan trips with friends and family, making group travel coordination effortless.',
      gradient: 'bg-gradient-to-br from-pink-400 to-rose-600',
    },
    {
      icon: Palette,
      title: 'Personalized Experience',
      description:
        'Every itinerary is uniquely crafted to match your interests, pace preferences, and travel style.',
      gradient: 'bg-gradient-to-br from-violet-400 to-purple-600',
    },
  ];

  return (
    <section className="py-20 bg-gray-50" id="features">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            Features That Set Us Apart
          </h2>
          <p className="text-lg text-gray-600">
            Discover how WanderAI makes your travel planning experience seamless and personalized
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map(feature => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              gradient={feature.gradient}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
