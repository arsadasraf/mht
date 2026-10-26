import { redirect } from 'next/navigation';

export default function GateEntryPage() {
  redirect('/quality/incoming-inspection');
}