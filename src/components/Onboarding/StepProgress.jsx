import React from 'react';
import { Check } from 'lucide-react';

const StepProgress = ({ steps = [], current = 0, onStepClick }) => {
  return (
    <div className="relative">
      <div className="mx-auto rounded-3xl bg-white border border-gray-100 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.15)]">
        <div className="px-8 py-8">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => {
              const isCompleted = s.status === 'completed' || i < current;
              const isCurrent = s.status === 'in_progress' || i === current;
              const isPending = s.status === 'pending' || i > current;
              const leftConnected = i > 0;
              const rightConnected = i < steps.length - 1;

              return (
                <div key={s.id} className="flex-1 flex flex-col items-start">
                  <div className="flex items-center w-full">
                    {leftConnected && (
                      <div className={`hidden md:block h-1.5 flex-1 rounded-full mr-4 transition-all duration-500 ${i <= current ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gray-200'
                        }`}></div>
                    )}

                    <button
                      onClick={() => onStepClick?.(s.id)}
                      className={`relative shrink-0 flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 transform hover:scale-110 ${isCompleted
                          ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-200'
                          : isCurrent
                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-200'
                            : 'bg-gray-100 border-2 border-gray-300'
                        }`}
                      aria-current={isCurrent ? 'step' : undefined}
                    >
                      {isCompleted ? (
                        <Check className="w-6 h-6 text-white" strokeWidth={3} />
                      ) : isCurrent ? (
                        <span className="absolute inset-0 rounded-full ring-4 ring-blue-300 ring-opacity-40 animate-pulse"></span>
                      ) : null}
                      {!isCompleted && (
                        <span className={`text-lg font-bold ${isCurrent ? 'text-white' : 'text-gray-400'}`}>
                          {i + 1}
                        </span>
                      )}
                    </button>

                    {rightConnected && (
                      <div className="hidden md:block relative flex-1 h-1.5 ml-4">
                        <div className="absolute inset-0 rounded-full bg-gray-200"></div>
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${i === current ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : i < current ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-transparent'
                            }`}
                          style={{ width: i < current ? '100%' : i === current ? '50%' : '0%' }}
                        />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => onStepClick?.(s.id)}
                    className="mt-4 text-left focus:outline-none"
                    title={s.title}
                  >
                    <div className="text-[10px] tracking-wider uppercase font-semibold text-gray-400 mb-0.5">
                      {i + 1}
                    </div>
                    <div className={`text-sm font-bold mb-1 transition-colors ${isCurrent ? 'text-blue-600' : isCompleted ? 'text-emerald-600' : 'text-gray-500'
                      }`}>
                      {s.title}
                    </div>
                    <div className="text-[11px] text-gray-500 leading-relaxed">
                      {s.subtitle}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepProgress;