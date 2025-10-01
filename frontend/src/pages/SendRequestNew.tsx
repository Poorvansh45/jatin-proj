import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Navigation from "../components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import apiService from "../services/api";

interface Category {
  _id: string;
  name: string;
  description: string;
  icon: string;
}

const SendRequest = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    categoryId: "",
    urgency: "medium",
    estimatedDuration: "",
    location: "",
    isRemote: true,
    budgetMin: "",
    budgetMax: "",
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await apiService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      // Use fallback categories if API fails
      setCategories([
        {
          _id: "1",
          name: "Programming",
          description: "Software development",
          icon: "code",
        },
        { _id: "2", name: "Design", description: "UI/UX design", icon: "palette" },
        {
          _id: "3",
          name: "Mathematics",
          description: "Math problems",
          icon: "calculator",
        },
        {
          _id: "4",
          name: "Languages",
          description: "Language learning",
          icon: "globe",
        },
        { _id: "5", name: "Writing", description: "Content writing", icon: "pen" },
        { _id: "6", name: "Other", description: "Other subjects", icon: "help" },
      ]);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter((skill) => skill !== skillToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.description || !formData.categoryId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const requestData = {
        title: formData.title,
        description: formData.description,
        categoryId: formData.categoryId,
        skillsNeeded: skills,
        urgency: formData.urgency,
        estimatedDuration: formData.estimatedDuration,
        location: formData.location,
        isRemote: formData.isRemote,
        budgetMin: formData.budgetMin ? parseFloat(formData.budgetMin) : null,
        budgetMax: formData.budgetMax ? parseFloat(formData.budgetMax) : null,
      };

      await apiService.createRequest(requestData);

      toast({
        title: "Success",
        description: "Your help request has been posted!",
      });

      navigate("/accept-request");
    } catch (error) {
      console.error("Failed to create request:", error);
      toast({
        title: "Error",
        description: "Failed to post your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-slate-800 border-slate-700 text-white">
            <CardHeader>
              <CardTitle className="text-2xl text-center text-white">
                Post a Help Request
              </CardTitle>
              <CardDescription className="text-center text-slate-300">
                Describe what you need help with and connect with skilled peers
              </CardDescription>
            </CardHeader>

            <CardContent className="text-white">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-white">Title *</Label>
                  <Input
                    id="title"
                    placeholder="What do you need help with?"
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    required
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-cyan-400"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-white">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Provide more details about your request..."
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    rows={4}
                    required
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-cyan-400"
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label className="text-white">Category *</Label>
                  <Select
                    onValueChange={(value) =>
                      handleInputChange("categoryId", value)
                    }>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white focus:border-cyan-400">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {categories.map((category) => (
                        <SelectItem
                          key={category._id}
                          value={category._id}
                          className="text-white hover:bg-slate-600">
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Skills Needed */}
                <div className="space-y-2">
                  <Label className="text-white">Skills Needed</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a skill"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" && (e.preventDefault(), addSkill())
                      }
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-cyan-400"
                    />
                    <Button type="button" onClick={addSkill} variant="outline" className="border-slate-600 text-white hover:bg-slate-600">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="cursor-pointer bg-slate-600 text-white hover:bg-slate-500"
                        onClick={() => removeSkill(skill)}>
                        {skill} ×
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Urgency */}
                <div className="space-y-2">
                  <Label className="text-white">Urgency</Label>
                  <Select
                    onValueChange={(value) =>
                      handleInputChange("urgency", value)
                    }
                    defaultValue="medium">
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white focus:border-cyan-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="low" className="text-white hover:bg-slate-600">Low - Can wait</SelectItem>
                      <SelectItem value="medium" className="text-white hover:bg-slate-600">
                        Medium - Within a week
                      </SelectItem>
                      <SelectItem value="high" className="text-white hover:bg-slate-600">High - Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-white">Estimated Duration</Label>
                  <Input
                    id="duration"
                    placeholder="e.g., 2 hours, 1 day, 1 week"
                    value={formData.estimatedDuration}
                    onChange={(e) =>
                      handleInputChange("estimatedDuration", e.target.value)
                    }
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-cyan-400"
                  />
                </div>

                {/* Remote/Location */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="remote"
                      checked={formData.isRemote}
                      
                      onCheckedChange={(checked) =>
                        handleInputChange("isRemote", checked)
                      }
                      className="data-[state=checked]:bg-cyan-400 data-[state=unchecked]:bg-slate-600"
                    />
                    <Label htmlFor="remote" className="text-white">Remote help is okay</Label>
                  </div>

                  {!formData.isRemote && (
                    <div className="space-y-2">
                      <Label htmlFor="location" className="text-white">Location</Label>
                      <Input
                        id="location"
                        placeholder="Where do you need help?"
                        value={formData.location}
                        onChange={(e) =>
                          handleInputChange("location", e.target.value)
                        }
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-cyan-400"
                      />
                    </div>
                  )}
                </div>

                {/* Budget */}
                <div className="space-y-2">
                  <Label className="text-white">Budget (Optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Min $"
                      type="number"
                      value={formData.budgetMin}
                      onChange={(e) =>
                        handleInputChange("budgetMin", e.target.value)
                      }
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-cyan-400"
                    />
                    <Input
                      placeholder="Max $"
                      type="number"
                      value={formData.budgetMax}
                      onChange={(e) =>
                        handleInputChange("budgetMax", e.target.value)
                      }
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-cyan-400"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white" disabled={loading}>
                  {loading ? "Posting..." : "Post Request"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SendRequest;
