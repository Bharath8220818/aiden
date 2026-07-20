import React from 'react';
import { FileText } from 'lucide-react';

const TermsPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto p-6 animate-fade-in">
      <div className="card space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Terms of Service</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Last updated: July 20, 2026</p>
          </div>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 space-y-4">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing or using AIDEN ("the Platform"), you agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">2. Description of Service</h2>
            <p>
              AIDEN is an AI-powered data engineering platform that assists users in creating, managing, 
              and monitoring data pipelines through natural language interactions and automated workflows.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">3. User Responsibilities</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You agree not to use the Platform for any unlawful purpose or in violation of any applicable laws.</li>
              <li>You are responsible for all data processed through your pipelines.</li>
              <li>You must not attempt to disrupt, compromise, or gain unauthorized access to the Platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">4. Intellectual Property</h2>
            <p>
              The Platform, including its code, design, and content, is owned by AIDEN and protected by 
              intellectual property laws. You retain ownership of any data you process through the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">5. Limitation of Liability</h2>
            <p>
              AIDEN is provided "as is" without warranty of any kind. In no event shall AIDEN be liable 
              for any damages arising from the use or inability to use the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">6. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Users will be notified of material 
              changes via email or through the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">7. Contact</h2>
            <p>
              For questions about these terms, please contact us at{' '}
              <a href="mailto:support@aiden.ai" className="text-blue-600 dark:text-blue-400 underline underline-offset-2">
                support@aiden.ai
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
