"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { AdminDashboard } from '../../src/views/AdminDashboard';

export default function AdminPage() {
  const router = useRouter();
  return <AdminDashboard onBack={() => router.push('/')} />;
}