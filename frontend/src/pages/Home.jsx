import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6 }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const features = [
  {
    icon: (
      <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
      </svg>
    ),
    title: "Advanced Threat Detection",
    description: "Identify and classify potential threats with state-of-the-art machine learning models trained on diverse security data."
  },
  {
    icon: (
      <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
      </svg>
    ),
    title: "Real-time Analysis",
    description: "Process and analyze data in real-time, providing immediate insights and enabling rapid response to emerging threats."
  },
  {
    icon: (
      <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
      </svg>
    ),
    title: "Geospatial Intelligence",
    description: "Visualize threat patterns and hotspots with interactive mapping tools for enhanced situational awareness."
  },
  {
    icon: (
      <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
      </svg>
    ),
    title: "Customizable Dashboard",
    description: "Configure your workspace with personalized metrics and visualizations to monitor what matters most to your organization."
  }
];

const testimonials = [
  {
    quote: "Astra has transformed our security operations with its intuitive threat detection capabilities.",
    author: "Sarah Johnson",
    title: "Chief Security Officer, TechCorp"
  },
  {
    quote: "The geospatial analysis features have helped us identify patterns we never would have noticed otherwise.",
    author: "Michael Chen",
    title: "Security Analyst, SecureNet"
  },
  {
    quote: "Implementation was seamless and the results were immediate. A game-changer for our team.",
    author: "Dr. Alex Rivera",
    title: "Director of Intelligence, GlobalDefend"
  }
];

export default function Home() {
  return (
    <div className="bg-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/30 via-transparent to-transparent transform -skew-y-6 z-0"></div>
        <div className="absolute inset-y-0 right-0 w-1/2 bg-blue-500/5 z-0 rounded-l-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16 relative z-10">
          <motion.div 
            className="text-center md:text-left md:flex md:items-center md:justify-between"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="md:w-1/2 mb-10 md:mb-0">
              <motion.h1 
                className="text-5xl lg:text-6xl font-extrabold text-white mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.7 }}
              >
                Next-Gen <span className="text-blue-400">Threat</span> Intelligence Platform
              </motion.h1>
              <motion.p 
                className="text-xl text-slate-300 mb-8 max-w-lg mx-auto md:mx-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.7 }}
              >
                Harness the power of advanced AI to detect, analyze and respond to threats in real-time. Protect your organization with Astra.
              </motion.p>
              <motion.div 
                className="flex flex-col sm:flex-row justify-center md:justify-start space-y-4 sm:space-y-0 sm:space-x-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.7 }}
              >
                <Link to="/about" className="px-8 py-3 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors">
                  Learn More
                </Link>
                <Link to="/contact" className="px-8 py-3 rounded-md bg-slate-700 text-white font-medium hover:bg-slate-600 transition-colors">
                  Contact Us
                </Link>
              </motion.div>
            </div>
            
            <motion.div 
              className="md:w-5/12"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.7 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 rounded-lg blur-xl"></div>
                <div className="relative bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-2">
                      <div className="h-3 w-3 bg-red-500 rounded-full"></div>
                      <div className="h-3 w-3 bg-yellow-500 rounded-full"></div>
                      <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="text-xs text-slate-400">Threat Analysis</div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-2 bg-slate-700 rounded-full w-3/4"></div>
                    <div className="h-2 bg-slate-700 rounded-full"></div>
                    <div className="h-2 bg-slate-700 rounded-full w-5/6"></div>
                  </div>
                  <div className="mt-6 p-3 bg-slate-900 rounded border border-slate-700">
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-slate-300">Threat Detection</div>
                      <div className="text-sm font-medium text-blue-400">96.7%</div>
                    </div>
                    <div className="mt-2 h-2 bg-slate-700 rounded-full">
                      <div className="h-full bg-blue-400 rounded-full" style={{ width: '96.7%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-16 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-14"
            variants={fadeIn}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <h2 className="text-3xl font-bold text-white mb-4">Powerful Features</h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              Astra delivers enterprise-grade security intelligence tools in a modern, intuitive platform.
            </p>
          </motion.div>
          
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            {features.map((feature, index) => (
              <motion.div 
                key={index} 
                className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-blue-500/50 transition-colors"
                variants={fadeIn}
              >
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
      
      {/* Statistics Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            <motion.div variants={fadeIn} className="text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">99.7%</div>
              <div className="text-sm text-slate-300">Detection Accuracy</div>
            </motion.div>
            <motion.div variants={fadeIn} className="text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">500+</div>
              <div className="text-sm text-slate-300">Organizations Protected</div>
            </motion.div>
            <motion.div variants={fadeIn} className="text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">50M+</div>
              <div className="text-sm text-slate-300">Threats Analyzed</div>
            </motion.div>
            <motion.div variants={fadeIn} className="text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">24/7</div>
              <div className="text-sm text-slate-300">Continuous Monitoring</div>
            </motion.div>
          </motion.div>
        </div>
      </section>
      
      {/* Testimonials Section */}
      <section className="py-16 bg-slate-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-14"
            variants={fadeIn}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-white mb-4">Trusted by Security Professionals</h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              See what our clients have to say about Astra's impact on their security operations.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div 
                key={index}
                className="bg-slate-800 rounded-xl p-6 border border-slate-700"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                viewport={{ once: true }}
              >
                <svg className="w-10 h-10 text-blue-400 mb-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.51.886-3.995 2.757-3.995 5.273h2.5V21h-8.483zm-14 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151C7.49 6.037 6.005 7.908 6.005 10.424h2.5V21H.017z" />
                </svg>
                <p className="text-slate-300 mb-4 italic">{testimonial.quote}</p>
                <div>
                  <p className="text-white font-medium">{testimonial.author}</p>
                  <p className="text-slate-400 text-sm">{testimonial.title}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16">
        <motion.div 
          className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-10 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-bold text-white mb-4">Ready to enhance your threat intelligence?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join leading organizations that trust Astra to protect their assets and data.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <button className="px-8 py-3 rounded-md bg-white text-blue-700 font-medium hover:bg-blue-50 transition-colors">
              Get Started
            </button>
            <Link to="/contact" className="px-8 py-3 rounded-md bg-blue-700 text-white font-medium hover:bg-blue-800 transition-colors">
              Contact Sales
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
} 