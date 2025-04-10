"use client"

import React from 'react';
import { ArrowRight,Recycle, Trophy, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import ConnectWallet from '@/components/shared/ConnectWallet';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const Home = () => {
  const router = useRouter();

  const handleConnectSuccess = () => {
    router.push('/loginRegister');
  };

  const features = [
    {
      icon: <Recycle className="h-12 w-12 text-green-600" />,
      title: "Smart Waste Collection",
      description: "Register and track your waste collections using our blockchain-powered QR system for transparent and efficient recycling."
    },
    {
      icon: <Trophy className="h-12 w-12 text-yellow-600" />,
      title: "Reward Points",
      description: "Earn points for your recycling efforts. The more you recycle, the more rewards you can claim from our partner network."
    },
    {
      icon: <Users className="h-12 w-12 text-blue-600" />,
      title: "Community Impact",
      description: "Join a growing community of environmentally conscious individuals making a real difference in waste management."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-20 pb-16">
        <div className="text-center">
          <h1 className="mb-6 text-5xl font-bold text-gray-900">
            Revolutionizing Waste Management
          </h1>
          <p className="mb-8 text-xl text-gray-600 max-w-2xl mx-auto">
            Join our blockchain-powered platform that rewards you for responsible waste disposal. 
            Make an impact while earning rewards for your recycling efforts.
          </p>
          <div className="flex gap-4 justify-center">
            <ConnectWallet 
              onSuccess={handleConnectSuccess}
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
            />
            <Button variant="outline" className="text-green-600 border-2 border-green-600">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
          <h2>
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Impact Statistics Section */}
      <section className="bg-green-600 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <h3 className="text-4xl font-bold mb-2">10,000+</h3>
              <p className="text-green-100">Active Users</p>
            </div>
            <div>
              <h3 className="text-4xl font-bold mb-2">50,000kg</h3>
              <p className="text-green-100">Waste Collected</p>
            </div>
            <div>
              <h3 className="text-4xl font-bold mb-2">₹500,000</h3>
              <p className="text-green-100">Rewards Distributed</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold mb-6 text-gray-900">
          Ready to Make a Difference?
        </h2>
        <p className="mb-8 text-xl text-gray-600 max-w-2xl mx-auto">
          Join our platform today and start contributing to a cleaner, more sustainable future while earning rewards.
        </p>
        <button className="inline-flex items-center px-8 py-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors">
          <Link href="/loginRegister">Start Recycling Now</Link>
          <ArrowRight className="ml-2 h-5 w-5" />
        </button>
      </section>
    </div>
  );
};

export default Home;
