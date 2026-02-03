'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type AnimationVariant =
  | 'fade-up'
  | 'fade-down'
  | 'fade-left'
  | 'fade-right'
  | 'fade'
  | 'scale'
  | 'blur'
  | 'hero-title' // Dramatic scale + blur + fade for main headlines
  | 'hero-badge' // Bounce down effect for badges
  | 'zoom-blur'  // Zoom in with blur clear

interface ScrollAnimateProps {
  children: ReactNode
  className?: string
  variant?: AnimationVariant
  delay?: number // delay in ms
  duration?: number // duration in ms
  threshold?: number // 0-1, percentage of element visible to trigger
  once?: boolean // only animate once
  as?: keyof JSX.IntrinsicElements
}

/**
 * ScrollAnimate - Animate elements when they enter the viewport
 *
 * Respects prefers-reduced-motion for accessibility.
 * Uses Intersection Observer for performance.
 * Uses transform and opacity for smooth, GPU-accelerated animations.
 *
 * 2026 best practices:
 * - Faster durations (200-400ms for micro-interactions)
 * - Early triggers (rootMargin: 50px to start before fully visible)
 * - Lower delays for snappy feel
 */
export function ScrollAnimate({
  children,
  className,
  variant = 'fade-up',
  delay = 0,
  duration = 400, // Reduced from 500ms for snappier feel
  threshold = 0.05, // Lower threshold - trigger earlier
  once = true,
  as: Component = 'div',
}: ScrollAnimateProps) {
  const ref = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    const element = ref.current
    if (!element) return

    // If user prefers reduced motion, show content immediately
    if (prefersReducedMotion) {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (once) {
            observer.unobserve(element)
          }
        } else if (!once) {
          setIsVisible(false)
        }
      },
      {
        threshold,
        // Positive rootMargin = trigger BEFORE element enters viewport
        // This prevents blank areas as user scrolls
        rootMargin: '50px 0px 0px 0px'
      }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [threshold, once, prefersReducedMotion])

  // Get initial and animated styles based on variant
  const getVariantStyles = () => {
    if (prefersReducedMotion) {
      return { opacity: 1, transform: 'none', filter: 'none' }
    }

    const baseHidden = { opacity: 0 }
    const baseVisible = { opacity: 1 }

    // 2026 best practice: Subtler transforms (16-24px) feel more refined
    // than larger movements (30-40px) which can feel sluggish
    switch (variant) {
      case 'fade-up':
        return isVisible
          ? { ...baseVisible, transform: 'translateY(0)' }
          : { ...baseHidden, transform: 'translateY(20px)' }
      case 'fade-down':
        return isVisible
          ? { ...baseVisible, transform: 'translateY(0)' }
          : { ...baseHidden, transform: 'translateY(-20px)' }
      case 'fade-left':
        return isVisible
          ? { ...baseVisible, transform: 'translateX(0)' }
          : { ...baseHidden, transform: 'translateX(20px)' }
      case 'fade-right':
        return isVisible
          ? { ...baseVisible, transform: 'translateX(0)' }
          : { ...baseHidden, transform: 'translateX(-20px)' }
      case 'fade':
        return isVisible ? baseVisible : baseHidden
      case 'scale':
        return isVisible
          ? { ...baseVisible, transform: 'scale(1)' }
          : { ...baseHidden, transform: 'scale(0.97)' }
      case 'blur':
        return isVisible
          ? { ...baseVisible, filter: 'blur(0px)' }
          : { ...baseHidden, filter: 'blur(6px)' }
      case 'hero-title':
        // Refined hero entrance: subtle scale + blur
        return isVisible
          ? { ...baseVisible, transform: 'scale(1) translateY(0)', filter: 'blur(0px)' }
          : { ...baseHidden, transform: 'scale(0.95) translateY(24px)', filter: 'blur(8px)' }
      case 'hero-badge':
        // Subtle drop effect for badges
        return isVisible
          ? { ...baseVisible, transform: 'translateY(0) scale(1)' }
          : { ...baseHidden, transform: 'translateY(-16px) scale(0.95)' }
      case 'zoom-blur':
        // Subtle zoom with blur clear
        return isVisible
          ? { ...baseVisible, transform: 'scale(1)', filter: 'blur(0px)' }
          : { ...baseHidden, transform: 'scale(0.97)', filter: 'blur(4px)' }
      default:
        return isVisible ? baseVisible : baseHidden
    }
  }

  const styles = getVariantStyles()

  const DynamicComponent = Component as any

  return (
    <DynamicComponent
      ref={ref}
      className={cn(className)}
      style={{
        ...styles,
        transitionProperty: 'opacity, transform, filter',
        transitionDuration: prefersReducedMotion ? '0ms' : `${duration}ms`,
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)', // ease-out-expo
        transitionDelay: prefersReducedMotion ? '0ms' : `${delay}ms`,
        willChange: isVisible ? 'auto' : 'opacity, transform',
      }}
    >
      {children}
    </DynamicComponent>
  )
}

/**
 * StaggerContainer - Wrapper that provides staggered animation delays to children
 */
interface StaggerContainerProps {
  children: ReactNode
  className?: string
  staggerDelay?: number // delay between each child in ms
  as?: keyof JSX.IntrinsicElements
}

export function StaggerContainer({
  children,
  className,
  staggerDelay = 100,
  as: Component = 'div',
}: StaggerContainerProps) {
  const DynamicComponent = Component as any

  return (
    <DynamicComponent className={className}>
      {Array.isArray(children)
        ? children.map((child, index) => (
            <ScrollAnimate key={index} delay={index * staggerDelay}>
              {child}
            </ScrollAnimate>
          ))
        : children}
    </DynamicComponent>
  )
}

/**
 * FloatingElement - Subtle floating animation for decorative elements
 * Only activates if user doesn't prefer reduced motion
 */
interface FloatingElementProps {
  children: ReactNode
  className?: string
  amplitude?: number // px to move
  duration?: number // seconds for one cycle
}

export function FloatingElement({
  children,
  className,
  amplitude = 10,
  duration = 6,
}: FloatingElementProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(true)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return (
    <div
      className={cn(className)}
      style={
        prefersReducedMotion
          ? {}
          : {
              animation: `float ${duration}s ease-in-out infinite`,
              ['--float-amplitude' as any]: `${amplitude}px`,
            }
      }
    >
      {children}
    </div>
  )
}

/**
 * ParallaxLayer - Creates depth with mouse-following parallax effect
 * 2026 trend: 3D depth-based motion for hero sections
 */
interface ParallaxLayerProps {
  children: ReactNode
  className?: string
  depth?: number // 0-1, how much to move (0 = no movement, 1 = max movement)
  maxOffset?: number // max pixels to move
}

export function ParallaxLayer({
  children,
  className,
  depth = 0.5,
  maxOffset = 30,
}: ParallaxLayerProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(true)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (prefersReducedMotion) return

    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      const x = ((e.clientX - centerX) / centerX) * maxOffset * depth
      const y = ((e.clientY - centerY) / centerY) * maxOffset * depth
      setOffset({ x, y })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [depth, maxOffset, prefersReducedMotion])

  return (
    <div
      className={cn('transition-transform duration-200 ease-out', className)}
      style={
        prefersReducedMotion
          ? {}
          : {
              transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
            }
      }
    >
      {children}
    </div>
  )
}

/**
 * TextReveal - Kinetic typography with word-by-word reveal
 * 2026 trend: Meaningful motion that guides attention
 */
interface TextRevealProps {
  text: string
  className?: string
  wordDelay?: number
  initialDelay?: number
  duration?: number
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3'
}

export function TextReveal({
  text,
  className,
  wordDelay = 80,
  initialDelay = 0,
  duration = 600,
  as: Component = 'span',
}: TextRevealProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(true)
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    const element = ref.current
    if (!element) return

    if (prefersReducedMotion) {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(element)
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [prefersReducedMotion])

  const words = text.split(' ')

  if (prefersReducedMotion) {
    return <Component className={className}>{text}</Component>
  }

  const DynamicComponent = Component as any

  return (
    <DynamicComponent ref={ref} className={cn('inline', className)}>
      {words.map((word, index) => (
        <span
          key={index}
          className="inline-block"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0) rotateX(0deg)' : 'translateY(40px) rotateX(-15deg)',
            transitionProperty: 'opacity, transform',
            transitionDuration: `${duration}ms`,
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            transitionDelay: `${initialDelay + index * wordDelay}ms`,
            transformOrigin: 'bottom center',
          }}
        >
          {word}
          {index < words.length - 1 && '\u00A0'}
        </span>
      ))}
    </DynamicComponent>
  )
}

/**
 * MagneticButton - Button that responds to mouse proximity
 * 2026 trend: Meaningful micro-interactions
 */
interface MagneticButtonProps {
  children: ReactNode
  className?: string
  strength?: number
}

export function MagneticButton({
  children,
  className,
  strength = 0.3,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(true)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  const handleMouseMove = (e: React.MouseEvent) => {
    if (prefersReducedMotion || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const x = (e.clientX - centerX) * strength
    const y = (e.clientY - centerY) * strength
    setOffset({ x, y })
  }

  const handleMouseLeave = () => {
    setOffset({ x: 0, y: 0 })
  }

  return (
    <div
      ref={ref}
      className={cn('inline-block transition-transform duration-200 ease-out', className)}
      style={{
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  )
}

/**
 * ShimmerText - Text with animated gradient shimmer
 * 2026 trend: Kinetic typography
 */
interface ShimmerTextProps {
  children: ReactNode
  className?: string
}

export function ShimmerText({ children, className }: ShimmerTextProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(true)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return (
    <span
      className={cn(
        'bg-clip-text text-transparent bg-gradient-to-r',
        prefersReducedMotion ? '' : 'animate-shimmer-text',
        className
      )}
      style={{
        backgroundSize: prefersReducedMotion ? '100% 100%' : '200% 100%',
      }}
    >
      {children}
    </span>
  )
}

/**
 * GlowOrb - Animated glowing background orb for hero sections
 */
interface GlowOrbProps {
  className?: string
  color?: 'blue' | 'indigo' | 'purple' | 'cyan'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  intensity?: 'subtle' | 'medium' | 'strong'
  floatAmplitude?: number
  floatDuration?: number
  pulseScale?: number
}

export function GlowOrb({
  className,
  color = 'blue',
  size = 'md',
  intensity = 'medium',
  floatAmplitude = 15,
  floatDuration = 8,
  pulseScale = 1.1,
}: GlowOrbProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(true)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  const sizeClasses = {
    sm: 'w-48 h-48',
    md: 'w-72 h-72',
    lg: 'w-96 h-96',
    xl: 'w-[500px] h-[500px]',
  }

  const colorClasses = {
    blue: 'from-blue-400/30 to-cyan-400/20 dark:from-blue-500/20 dark:to-cyan-500/15',
    indigo: 'from-indigo-400/30 to-purple-400/20 dark:from-indigo-500/20 dark:to-purple-500/15',
    purple: 'from-purple-400/30 to-pink-400/20 dark:from-purple-500/20 dark:to-pink-500/15',
    cyan: 'from-cyan-400/30 to-blue-400/20 dark:from-cyan-500/20 dark:to-blue-500/15',
  }

  const intensityBlur = {
    subtle: 'blur-2xl',
    medium: 'blur-3xl',
    strong: 'blur-[80px]',
  }

  return (
    <div
      className={cn(
        'absolute rounded-full bg-gradient-radial',
        sizeClasses[size],
        colorClasses[color],
        intensityBlur[intensity],
        className
      )}
      style={
        prefersReducedMotion
          ? {}
          : {
              animation: `float ${floatDuration}s ease-in-out infinite, glow-pulse ${floatDuration * 1.5}s ease-in-out infinite`,
              ['--float-amplitude' as any]: `${floatAmplitude}px`,
              ['--pulse-scale' as any]: pulseScale,
            }
      }
      aria-hidden="true"
    />
  )
}
