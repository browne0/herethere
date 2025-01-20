import React from 'react';

import { Metadata } from 'next';

import { Footer } from '@/components/landing/Footer';

const CookiePolicy: React.FC = () => {
  return (
    <>
      <div className="max-w-4xl mx-auto p-6 space-y-8 text-gray-700">
        <h1 className="text-3xl font-bold text-gray-800">Cookie Policy</h1>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800">1. Introduction</h2>
          <p>
            At HereThere, we use cookies to improve your experience on our site and to help us
            understand how you interact with our services. This Cookie Policy explains what cookies
            are, how we use them, and your options regarding their use.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800">2. What Are Cookies?</h2>
          <p>
            Cookies are small text files stored on your device (computer, tablet, or smartphone)
            when you visit a website. They help us remember your preferences and understand your
            behavior on our site, allowing us to tailor our services to you.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800">3. Types of Cookies We Use</h2>
          <p>We use the following types of cookies on HereThere:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Essential Cookies:</strong> These cookies are necessary for the functionality
              of our website. They enable core features like security and accessibility. Disabling
              these cookies may affect site performance.
            </li>
            <li>
              <strong>Analytical Cookies:</strong> These cookies help us analyze how visitors use
              our site, allowing us to improve and optimize HereThere’s performance. Data collected
              by these cookies is aggregated and anonymous.
            </li>
            <li>
              <strong>Functional Cookies:</strong> These cookies allow us to remember your
              preferences and personalize your experience on HereThere, such as remembering your
              language preferences or login details.
            </li>
            <li>
              <strong>Marketing Cookies:</strong> These cookies track your online activity to help
              us deliver relevant advertisements based on your interests. They may be used in
              conjunction with advertising platforms.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800">4. How We Use Cookies</h2>
          <p>
            We use cookies to provide a seamless experience on HereThere, to analyze website
            traffic, to personalize content, and to serve targeted advertisements. For more
            information on how we use your data, please refer to our{' '}
            <a href="/privacy-policy" className="text-blue-600 hover:underline">
              Privacy Policy
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800">
            5. Managing Your Cookie Preferences
          </h2>
          <p>
            You can manage your cookie preferences by adjusting the settings on your browser. Most
            browsers allow you to control cookies through their settings. However, please note that
            disabling certain cookies may impact your experience on HereThere and limit some
            functionalities.
          </p>
          <p>
            Additionally, you can opt-out of certain types of cookies by adjusting your preferences
            on our cookie consent banner, which appears when you first visit our site.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800">6. Third-Party Cookies</h2>
          <p>
            Some cookies on HereThere are placed by third-party service providers, such as analytics
            or advertising partners. These cookies allow these providers to collect information
            about your device and browsing behavior on our site and, in some cases, across other
            websites.
          </p>
          <p>
            We do not control these third-party cookies and recommend reviewing the privacy policies
            of any third-party services to learn more about their cookie usage.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800">7. Changes to This Cookie Policy</h2>
          <p>
            We may update this Cookie Policy from time to time to reflect changes in our practices
            or for other operational, legal, or regulatory reasons. Please review this Cookie Policy
            periodically to stay informed about our use of cookies.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800">8. Contact Us</h2>
          <p>
            If you have any questions or concerns about our use of cookies, please contact us at{' '}
            <a href="mailto:support@HereThere.com" className="text-blue-600 hover:underline">
              support@HereThere.com
            </a>
            .
          </p>
        </section>
      </div>
      <Footer />
    </>
  );
};

export default CookiePolicy;

export const metadata: Metadata = {
  title: 'Cookie Policy',
};
