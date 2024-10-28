import { MapPin, Utensils, Calendar, Heart } from 'lucide-react';

interface StepProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  index: number;
}

const Step = ({ icon: Icon, title, description, index }: StepProps) => {
  return (
    <div className="relative group">
      {/* Connector line between steps */}
      {index < 4 && (
        <div className="hidden md:block absolute top-1/2 left-full w-full h-px bg-gradient-to-r from-indigo-200 to-transparent" />
      )}

      <div className="relative flex flex-col items-center p-6 bg-white rounded-2xl shadow-md transition-all duration-300 hover:shadow-lg">
        {/* Step number */}
        <div className="absolute -top-4 -left-4 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
          {index}
        </div>

        {/* Icon */}
        <div className="mb-4 p-3 rounded-full bg-indigo-50 text-indigo-600 transition-all duration-300 group-hover:bg-indigo-100 group-hover:scale-110">
          <Icon className="w-6 h-6" />
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold mb-2 text-gray-900">{title}</h3>
        <p className="text-gray-600 text-center text-sm">{description}</p>
      </div>
    </div>
  );
};

export function HowItWorks() {
  const steps = [
    {
      icon: MapPin,
      title: 'Choose Destination',
      description: 'Select your dream destination and travel dates for your next adventure',
    },
    {
      icon: Utensils,
      title: 'Set Preferences',
      description: 'Tell us about your dietary needs and travel style preferences',
    },
    {
      icon: Calendar,
      title: 'Get Itinerary',
      description: 'Receive an AI-powered personalized travel plan perfectly crafted for you',
    },
    {
      icon: Heart,
      title: 'Enjoy Your Trip',
      description: 'Experience your journey with confidence, knowing every detail is taken care of',
    },
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-white to-indigo-50/50" id="how-it-works">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            How It Works
          </h2>
          <p className="text-lg text-gray-600">
            Create your perfect trip in just a few simple steps
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-4 gap-8 md:gap-12">
          {steps.map((step, index) => (
            <Step
              key={step.title}
              icon={step.icon}
              title={step.title}
              description={step.description}
              index={index + 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
