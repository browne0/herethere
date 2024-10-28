import React from 'react';

import { Footer } from '@/components/landing/Footer';

const PrivacyPolicy: React.FC = () => {
  return (
    <>
      <div className="max-w-4xl mx-auto p-6 space-y-8 text-gray-700">
        <h1 className="text-3xl font-bold text-gray-800">Privacy Policy</h1>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800">1. Introduction</h2>
          <p>
            Welcome to WanderAI! This Privacy Policy explains how we collect, use, and share your
            personal information when you use our AI-powered travel itinerary planner. We prioritize
            your privacy and are committed to protecting your personal data.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800">2. Information We Collect</h2>
          <ul className="list-disc pl-6">
            <li>
              <strong>Account Information:</strong> When you sign up, we collect information such as
              your email, name, and profile image through Clerk authentication.
            </li>
            <li>
              <strong>User Preferences:</strong> Any dietary preferences or interests you provide to
              help us personalize your travel plans.
            </li>
            <li>
              <strong>Trip Data:</strong> Details about your trips, destinations, dates, activities,
              and locations to generate your customized itinerary.
            </li>
            <li>
              <strong>Automatically Collected Information:</strong> We may collect data about your
              device, IP address, and usage patterns to improve our service.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800">3. How We Use Your Information</h2>
          <p>
            WanderAI uses your information to generate AI-powered, personalized itineraries,
            tailored to your preferences and dietary needs. We may also use your data to improve our
            services, communicate with you, and keep our system secure.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800">4. Sharing Your Information</h2>
          <p>
            We respect your privacy and only share your information under limited circumstances:
          </p>
          <ul className="list-disc pl-6">
            <li>
              With service providers that assist us in offering our services, like AI integration.
            </li>
            <li>With law enforcement or government agencies if required by law.</li>
            <li>
              In the event of a merger or acquisition, your data may be transferred, subject to this
              privacy policy.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800">5. Data Security</h2>
          <p>
            We implement security measures to protect your information. However, no system is
            completely secure, and we cannot guarantee the absolute security of your data.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800">6. Your Rights</h2>
          <p>
            You have the right to access, update, or delete your personal data. You can manage your
            data by logging into your account or contacting us at support@WanderAI.com.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800">7. Changes to this Policy</h2>
          <p>
            We may update this Privacy Policy periodically. We encourage you to review this page
            regularly to stay informed about how we are protecting your data.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800">8. Contact Us</h2>
          <p>
            If you have questions or concerns about this Privacy Policy, please contact us at
            support@wanderai.com.
          </p>
        </section>
      </div>
      <Footer />
    </>
  );
};

export default PrivacyPolicy;
