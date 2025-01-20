import React from 'react';

import { Metadata } from 'next';

import { Footer } from '@/components/landing/Footer';

const TermsOfService: React.FC = () => {
  return (
    <>
      <div className="max-w-4xl mx-auto p-6 space-y-8 text-gray-700">
        <h1 className="text-3xl font-bold text-gray-800">Terms of Service</h1>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800">1. Introduction</h2>
          <p>
            Welcome to HereThere! These Terms of Service (“Terms”) govern your use of our AI-powered
            travel itinerary planner. By using our services, you agree to be bound by these Terms.
            Please read them carefully.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800">2. Eligibility</h2>
          <p>
            To use HereThere, you must be at least 18 years old or the age of majority in your
            jurisdiction. By creating an account, you represent that you meet this eligibility
            requirement.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800">3. Account Registration</h2>
          <p>
            To access certain features of HereThere, you may need to create an account using Clerk
            authentication. You agree to provide accurate and complete information and to update
            your account information as necessary. You are responsible for maintaining the
            confidentiality of your account credentials and for all activities that occur under your
            account.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800">4. Use of the Service</h2>
          <p>
            HereThere grants you a limited, non-exclusive, non-transferable, and revocable license
            to use our services for personal, non-commercial purposes. You agree not to:
          </p>
          <ul className="list-disc pl-6">
            <li>Copy, modify, or distribute any part of the service without our permission.</li>
            <li>Use the service for illegal or unauthorized purposes.</li>
            <li>Interfere with or disrupt the service’s functionality or security.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800">5. Payments & Subscriptions</h2>
          <p>
            Certain features of HereThere may require a subscription or one-time payment. You agree
            to pay all applicable fees and understand that failure to pay may result in restricted
            access to certain features. Payments are non-refundable unless required by law.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800">6. Intellectual Property</h2>
          <p>
            HereThere and its content, including but not limited to text, graphics, logos, and
            software, are the property of HereThere and protected by intellectual property laws. You
            agree not to use our content without our permission.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800">7. Limitation of Liability</h2>
          <p>
            HereThere is provided “as is” without warranties of any kind. We do not guarantee the
            accuracy or completeness of the information provided. To the maximum extent permitted by
            law, HereThere is not liable for any indirect, incidental, or consequential damages
            resulting from your use of our services.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800">8. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your account or access to HereThere at any
            time for any reason, including if you violate these Terms. Upon termination, your right
            to use the service will cease immediately.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800">9. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the jurisdiction in which HereThere operates.
            Any disputes arising from these Terms or your use of the service will be subject to the
            exclusive jurisdiction of the courts in that jurisdiction.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800">10. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. We encourage you to review these Terms
            periodically. Your continued use of HereThere following any changes constitutes
            acceptance of the revised Terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800">11. Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact us at support@HereThere.com.
          </p>
        </section>
      </div>
      <Footer />
    </>
  );
};

export default TermsOfService;

export const metadata: Metadata = {
  title: 'Terms of Service',
};
