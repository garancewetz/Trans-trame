export default function SearchInput({
  value,
  onChange,
  className,
  style,
  type = 'text',
  ...props
}) {
  return (
    <input
      value={value}
      onChange={onChange}
      type={type}
      className={className}
      style={style}
      {...props}
    />
  )
}
