import { motion } from 'framer-motion';
import { Cloud, Server, Globe, Cpu, HardDrive, Shield, ArrowRight, Clock, Star } from 'lucide-react';

const labs = [
  { id: 1, title: 'Deploy a Data Pipeline on AWS', provider: 'AWS', icon: Cloud, duration: '60 min', difficulty: 'Intermediate', rating: 4.7 },
  { id: 2, title: 'Build a Real-Time Dashboard with Azure', provider: 'Azure', icon: Server, duration: '45 min', difficulty: 'Beginner', rating: 4.5 },
  { id: 3, title: 'Serverless ETL with GCP', provider: 'GCP', icon: Globe, duration: '50 min', difficulty: 'Intermediate', rating: 4.8 },
  { id: 4, title: 'Kubernetes Data Pipeline Orchestration', provider: 'AWS', icon: Cpu, duration: '90 min', difficulty: 'Advanced', rating: 4.6 },
  { id: 5, title: 'Snowflake Data Warehouse Setup', provider: 'AWS', icon: HardDrive, duration: '40 min', difficulty: 'Beginner', rating: 4.9 },
  { id: 6, title: 'Data Governance with Azure Purview', provider: 'Azure', icon: Shield, duration: '55 min', difficulty: 'Advanced', rating: 4.4 },
];

const providerColors: Record<string, string> = {
  AWS: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Azure: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  GCP: 'bg-green-500/10 text-green-400 border-green-500/20',
};

export default function CloudLabsPage() {
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-[var(--color-text)]">☁️ Cloud Labs</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Hands-on labs for AWS, Azure, and GCP — practice in a sandbox environment
        </p>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {labs.map((lab, i) => (
          <motion.div key={lab.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass-card p-5 group cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20">
                <lab.icon className="h-5 w-5 text-purple-400" />
              </div>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${providerColors[lab.provider]}`}>
                {lab.provider}
              </span>
            </div>
            <h3 className="font-semibold text-[var(--color-text)] mb-1">{lab.title}</h3>
            <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)] mb-4">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {lab.duration}</span>
              <span>{lab.difficulty}</span>
              <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{lab.rating}</span>
            </div>
            <button className="btn-primary w-full py-2 text-xs">Start Lab <ArrowRight className="h-3 w-3" /></button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
