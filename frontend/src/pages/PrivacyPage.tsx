import React from 'react';
import { Shield } from 'lucide-react';

const PrivacyPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto p-6 animate-fade-in">
      <div className="card space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Last updated: July 20, 2026</p>
          </div>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 space-y-4">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">1. Information We Collect</h2>
            <p>
              We collect information you provide when creating an account, including your name, email address, 
              and authentication credentials. We also collect data processed through pipelines you create.
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Account Information:</strong> Name, email, username</li>
              <li><strong>Usage Data:</strong> Pipeline configurations, execution logs, feature interactions</li>
              <li><strong>Technical Data:</strong> IP address, browser type, device information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">2. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide, maintain, and improve the Platform</li>
              <li>To process and execute data pipelines as requested</li>
              <li>To send service-related communications</li>
              <li>To detect and prevent abuse or unauthorized access</li>
              <li>To generate anonymized analytics for product improvement</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">3. Data Storage and Security</h2>
            <p>
              Your data is stored using industry-standard encryption at rest and in transit. We implement 
              appropriate technical and organizational measures to protect your data against unauthorized 
              access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">4. Data Sharing</h2>
            <p>
              We do not sell your personal data. We may share data with third-party service providers 
              who assist in operating the Platform (e.g., cloud hosting, database services), subject to 
              strict confidentiality agreements.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">5. Your Rights</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access and review your personal data</li>
              <li>Request correction or deletion of your data</li>
              <li>Export your data in a portable format</li>
              <li>Withdraw consent for data processing</li>
              <li>Delete your account and associated data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">6. Cookies</h2>
            <p>
              We use essential cookies for authentication and session management. Analytics cookies may 
              be used to improve the Platform. You can control cookie settings through your browser preferences.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">7. Contact</h2>
            <p>
              For privacy-related inquiries, contact us at{' '}
              <a href="mailto:privacy@aiden.ai" className="text-blue-600 dark:text-blue-400 underline underline-offset-2">
                privacy@aiden.ai
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
