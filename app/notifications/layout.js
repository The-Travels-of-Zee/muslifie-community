import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

const layout = ({ children }) => {
  return (
    <div>
      <Navbar />
      <main>{children}</main>
    </div>
  );
};

export default layout;
