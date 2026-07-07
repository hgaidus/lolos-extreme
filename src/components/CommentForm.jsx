"use client";

import React, { useState } from 'react';

export default function CommentForm() {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !comment) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="p-6 bg-[#14532d] text-white rounded-xl border border-amber-500 text-center shadow-lg" style={{ padding: '24px', background: '#14532d', color: '#fff', borderRadius: '12px', border: '1px solid #f59e0b', textAlign: 'center' }}>
        <h4 className="text-lg font-bold text-amber-400 mb-2 m-0" style={{ fontSize: '1.25rem', color: '#f59e0b', margin: '0 0 8px 0' }}>
          🎉 Thank You, {name}!
        </h4>
        <p className="text-sm md:text-base m-0 text-gray-200" style={{ margin: 0, fontSize: '0.95rem', color: '#e2e8f0' }}>
          Your road trip note and camping advice have been submitted to our community discussion feed.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <input 
          type="text" 
          placeholder="Your Name / RV Call Sign *" 
          required 
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="p-3 rounded-lg border border-white/20 bg-black/40 text-white text-sm outline-none focus:border-amber-400"
          style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '0.9rem', outline: 'none', width: '100%', boxSizing: 'border-box' }}
        />
        <input 
          type="email" 
          placeholder="Email Address (Optional)" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="p-3 rounded-lg border border-white/20 bg-black/40 text-white text-sm outline-none focus:border-amber-400"
          style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '0.9rem', outline: 'none', width: '100%', boxSizing: 'border-box' }}
        />
      </div>
      <textarea 
        rows="4" 
        placeholder="Share your camping advice or road trip story..." 
        required 
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="p-3 rounded-lg border border-white/20 bg-black/40 text-white text-sm outline-none focus:border-amber-400 resize-y"
        style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '0.9rem', outline: 'none', width: '100%', boxSizing: 'border-box', minHeight: '100px', resize: 'vertical' }}
      ></textarea>
      <div className="text-right" style={{ textAlign: 'right' }}>
        <button 
          type="submit" 
          className="btn-gold text-sm font-semibold px-6 py-2.5 cursor-pointer"
          style={{ background: '#f59e0b', color: '#000', padding: '10px 24px', borderRadius: '6px', fontWeight: '700', border: 'none', cursor: 'pointer', fontSize: '0.95rem' }}
        >
          Post Comment &rarr;
        </button>
      </div>
    </form>
  );
}
