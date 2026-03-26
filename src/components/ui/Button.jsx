export default function Button({ className, style, type = 'button', ...props }) {
  return <button type={type} className={className} style={style} {...props} />
}
