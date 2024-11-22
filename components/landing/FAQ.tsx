'use client';
import { useState } from 'react';

import { ChevronDown, MessageCircle } from 'lucide-react';

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}

const FAQItem = ({ question, answer, isOpen, onToggle }: FAQItemProps) => {
  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={onToggle}
        className="flex justify-between items-center w-full py-6 text-left transition-colors hover:text-indigo-600"
      >
        <span className="font-medium text-lg pr-8">{question}</span>
        <ChevronDown
          className={`flex-shrink-0 w-5 h-5 transition-transform duration-300 ${
            isOpen ? 'transform rotate-180 text-indigo-600' : 'text-gray-400'
          }`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-96 opacity-100 mb-6' : 'max-h-0 opacity-0'
        }`}
      >
        <p className="text-gray-600 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
};

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number>(0);

  const faqs = [
    {
      question: 'How does HereThere create personalized itineraries?',
      answer:
        'HereThere uses advanced AI technology to analyze your preferences, dietary requirements, and travel style to create a custom itinerary. We consider factors like your chosen pace, budget, and specific interests to ensure every recommendation is perfectly suited to you.',
    },
    {
      question: "Can I modify my itinerary after it's generated?",
      answer:
        'Absolutely! Your itinerary is fully customizable. You can add, remove, or modify activities, adjust timings, and make any changes needed to perfect your trip plan. The AI-generated itinerary serves as a smart starting point that you can fine-tune to your exact preferences.',
    },
    {
      question: 'What dietary restrictions can HereThere accommodate?',
      answer:
        'HereThere supports a wide range of dietary requirements including vegetarian, vegan, gluten-free, kosher, halal, and various food allergies. Our system ensures all restaurant recommendations align with your specific dietary needs and preferences.',
    },
    {
      question: 'How far in advance should I plan my trip?',
      answer:
        'While you can create an itinerary at any time, we recommend planning at least a few weeks in advance to ensure availability for popular restaurants and activities. This also gives you time to refine your itinerary and make any necessary adjustments.',
    },
    {
      question: 'Can I share my itinerary with fellow travelers?',
      answer:
        "Yes! You can easily share your itinerary with travel companions, who can view and even collaborate on the trip planning if you grant them permission. This makes group trip planning seamless and ensures everyone's preferences are considered.",
    },
    {
      question: 'Is HereThere available worldwide?',
      answer:
        'HereThere currently supports major tourist destinations across the globe, with new locations being added regularly. Our service is particularly comprehensive in popular cities, ensuring detailed and accurate recommendations wherever you travel.',
    },
  ];

  return (
    <section className="py-20 bg-white" id="faq">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            Frequently Asked Questions
          </h2>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? -1 : index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
