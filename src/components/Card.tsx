import React from 'react'

interface CardProps {
  children: React.ReactNode
  title?: string
  className?: string
}

const Card = ({ children, title, className = '' }: CardProps) => {
  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      {title && (
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}

export default Card
