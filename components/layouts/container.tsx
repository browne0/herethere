interface ContainerProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = {
  sm: 'max-w-xl', // 36rem
  md: 'max-w-3xl', // 48rem
  lg: 'max-w-5xl', // 64rem
  xl: 'max-w-7xl', // 80rem
};

export function Container({ children, size = 'xl' }: ContainerProps) {
  return <div className={`${sizes[size]} mx-auto px-4 sm:px-6 lg:px-8 py-10`}>{children}</div>;
}
