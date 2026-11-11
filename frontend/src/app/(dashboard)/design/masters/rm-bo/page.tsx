import React from 'react';
import DesignMastersTab from '@/modules/design/components/DesignMastersTab';

export const metadata = {
  title: 'RM & BO Items Master | Design Engineering | MH ERP'
};

export default function RmBoMasterPage() {
  return <DesignMastersTab initialSubTab="rm-bo" />;
}

