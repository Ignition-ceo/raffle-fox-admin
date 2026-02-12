import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronDown, ChevronUp, Upload, X, FileText, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { getSponsors, type Sponsor } from "@/lib/firestore";
import { createPrizeDocument } from "@/lib/prize-service";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ── Schema ──────────────────────────────────────────────────────────

const formSchema = z.object({
  prizeName: z.string().min(1, "Prize name is required").max(200),
  quantityAvailable: z.string().min(1, "Quantity is required"),
  detail1: z.string().optional(),
  detail2: z.string().optional(),
  detail3: z.string().optional(),
  fullDescription: z.string().min(1, "Full description is required").max(2000),
  tags: z.string().min(1, "Tags are required"),
  sponsorId: z.string().min(1, "Sponsor is required"),
  prizeCategory: z.string().min(1, "Category is required"),
  stockDate: z.string().min(1, "Stock date is required"),
  fulfillmentMethod: z.string().min(1, "Fulfillment method is required"),
  deliveryTimeline: z.string().min(1, "Delivery timeline is required"),
  claimWindow: z.string().min(1, "Claim window is required"),
  pickupRequired: z.boolean(),
  eligibleRegions: z.string().min(1, "Eligible regions required"),
  retailValueUSD: z.string().min(1, "Prize value is required"),
  ageRestriction: z.string().min(1, "Age restriction is required"),
  idRequired: z.boolean(),
  useStandardTerms: z.boolean(),
  termsConditionsUrl: z.string().optional(),
  customTermsType: z.string().optional(),
  customTermsUrl: z.string().optional(),
  additionalInfo: z.string().optional(),
  acceptedTerms: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ── Dropdown option data ────────────────────────────────────────────

const PRIZE_CATEGORIES = [
  "Electronics",
  "Gift Cards",
  "Experiences",
  "Fashion",
  "Home & Garden",
  "Sports & Outdoors",
  "Food & Beverage",
  "Travel",
  "Other",
];

const FULFILLMENT_METHODS = ["Digital Delivery", "Physical Shipping", "In-Person Pickup", "Courier"];
const DELIVERY_TIMELINES = ["Instant", "1-3 Days", "3-7 Days", "1-2 Weeks", "2-4 Weeks"];
const CLAIM_WINDOWS = ["24 Hours", "48 Hours", "72 Hours", "1 Week", "2 Weeks", "1 Month"];
const REGIONS = [
  "arima", "chaguanas", "couva", "diego martin", "point fortin",
  "port of spain", "princes town", "san fernando", "san juan",
  "sangre grande", "siparia", "tobago", "tunapuna",
];

// ── Collapsible Section ─────────────────────────────────────────────

function Section({
  number,
  title,
  defaultOpen = true,
  children,
}: {
  number: number;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 bg-muted/60 text-sm font-semibold text-foreground"
      >
        <span>
          {number}. {title}
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && <div className="px-5 py-5 space-y-5">{children}</div>}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

interface CreatePrizeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function CreatePrizeModal({ open, onOpenChange, onCreated }: CreatePrizeModalProps) {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [categories, setCategories] = useState(PRIZE_CATEGORIES);
  const [newCategory, setNewCategory] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prizeName: "",
      quantityAvailable: "",
      detail1: "",
      detail2: "",
      detail3: "",
      fullDescription: "",
      tags: "",
      sponsorId: "",
      prizeCategory: "",
      stockDate: "",
      fulfillmentMethod: "",
      deliveryTimeline: "",
      claimWindow: "",
      pickupRequired: false,
      eligibleRegions: "",
      retailValueUSD: "",
      ageRestriction: "",
      idRequired: false,
      useStandardTerms: true,
      termsConditionsUrl: "",
      customTermsType: "url",
      customTermsUrl: "",
      additionalInfo: "",
      acceptedTerms: false,
    },
  });

  const retailValue = form.watch("retailValueUSD");
  const breakEvenValue = retailValue
    ? (Math.round(parseFloat(retailValue) * 0.25 * 100) / 100).toFixed(2)
    : "0.00";

  const useStandard = form.watch("useStandardTerms");
  const selectedSponsorId = form.watch("sponsorId");
  const selectedSponsor = sponsors.find((s) => s.id === selectedSponsorId);

  // Load sponsors
  useEffect(() => {
    if (open) {
      getSponsors().then(setSponsors).catch(console.error);
    }
  }, [open]);

  // Image handling
  const handleImageUpload = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const remaining = 4 - imageFiles.length;
      const newFiles = Array.from(files).slice(0, remaining);
      const updated = [...imageFiles, ...newFiles];
      setImageFiles(updated);

      newFiles.forEach((f) => {
        const reader = new FileReader();
        reader.onload = (e) =>
          setImagePreviews((prev) => [...prev, e.target?.result as string]);
        reader.readAsDataURL(f);
      });
    },
    [imageFiles]
  );

  const removeImage = (idx: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  // Region toggle
  const toggleRegion = (region: string) => {
    setSelectedRegions((prev) => {
      const next = prev.includes(region)
        ? prev.filter((r) => r !== region)
        : [...prev, region];
      form.setValue("eligibleRegions", next.join(", "), { shouldValidate: true });
      return next;
    });
  };

  // Add category
  const addCategory = () => {
    const trimmed = newCategory.trim();
    if (trimmed && !categories.includes(trimmed)) {
      setCategories((prev) => [...prev, trimmed]);
      form.setValue("prizeCategory", trimmed);
      setNewCategory("");
    }
  };

  // Submit
  const onSubmit = async (values: FormValues) => {
    if (imageFiles.length === 0) {
      toast({
        title: "Images required",
        description: "Please upload at least one image.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const keywords = [values.detail1, values.detail2, values.detail3].filter(Boolean) as string[];

      await createPrizeDocument(
        {
          prizeName: values.prizeName,
          quantityAvailable: String(values.quantityAvailable),
          fullDescription: values.fullDescription,
          keywords,
          tags: values.tags,
          sponsorId: values.sponsorId,
          prizeCategory: values.prizeCategory,
          stockDate: values.stockDate,
          fulfillmentMethod: values.fulfillmentMethod,
          deliveryTimeline: values.deliveryTimeline,
          claimWindow: values.claimWindow,
          pickupRequired: values.pickupRequired,
          eligibleRegions: values.eligibleRegions,
          retailValueUSD: String(values.retailValueUSD),
          breakEvenValue: Math.round(parseFloat(values.retailValueUSD) * 0.25 * 100) / 100,
          ageRestriction: values.ageRestriction,
          idRequired: values.idRequired,
          useStandardTerms: values.useStandardTerms,
          termsConditionsUrl: values.termsConditionsUrl || "",
          customTermsType: values.customTermsType || "",
          customTermsUrl: values.customTermsUrl || "",
          additionalInfo: values.additionalInfo || "",
          status: "Active",
        },
        imageFiles,
        values.sponsorId
      );

      toast({ title: "Prize created", description: `"${values.prizeName}" saved successfully.` });
      form.reset();
      setImageFiles([]);
      setImagePreviews([]);
      setSelectedRegions([]);
      onOpenChange(false);
      onCreated?.();
    } catch (err: any) {
      console.error("Error creating prize:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to create prize.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/40">
          <DialogTitle className="text-lg font-bold">Create Prize</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* ── Section 1: Basic Info ── */}
              <Section number={1} title="Basic Info">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="prizeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prize Name*</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter prize name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div>
                    <Label className="text-sm font-medium">Short Description - 3 Details</Label>
                    <div className="flex gap-2 mt-2">
                      <FormField control={form.control} name="detail1" render={({ field }) => (
                        <FormItem className="flex-1"><FormControl><Input placeholder="Detail 1" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="detail2" render={({ field }) => (
                        <FormItem className="flex-1"><FormControl><Input placeholder="Detail 2" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="detail3" render={({ field }) => (
                        <FormItem className="flex-1"><FormControl><Input placeholder="Detail 3" {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="quantityAvailable"
                  render={({ field }) => (
                    <FormItem className="max-w-xs">
                      <FormLabel>Quantity Item*</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Enter quantity" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fullDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Description*</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter full description" rows={4} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Images */}
                <div>
                  <Label className="text-sm font-medium">Images</Label>
                  <div className="mt-2 flex gap-4">
                    {/* Thumbnail preview */}
                    {imagePreviews.length > 0 && (
                      <div className="relative w-28 h-24 rounded-md overflow-hidden border border-border bg-muted flex-shrink-0">
                        <img src={imagePreviews[0]} alt="Thumbnail" className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center py-0.5">
                          Current Thumbnail
                        </span>
                        <button
                          type="button"
                          onClick={() => removeImage(0)}
                          className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3 text-white" />
                        </button>
                      </div>
                    )}
                    {/* Additional image previews */}
                    {imagePreviews.slice(1).map((src, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-md overflow-hidden border border-border bg-muted flex-shrink-0">
                        <img src={src} alt={`Image ${i + 2}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(i + 1)}
                          className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3 text-white" />
                        </button>
                      </div>
                    ))}
                    {/* Upload box */}
                    {imageFiles.length < 4 && (
                      <label className="flex-1 min-h-[96px] border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-muted/40 transition-colors">
                        <Upload className="h-5 w-5 text-primary" />
                        <span className="text-xs">
                          <span className="text-primary font-medium">Click to upload</span>{" "}
                          or drag and drop
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          SVG, PNG, JPG, or GIF (max: 800×400px)
                        </span>
                        <input
                          type="file"
                          multiple
                          accept="image/svg+xml,image/png,image/jpeg,image/gif"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e.target.files)}
                        />
                      </label>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Upload up to 4 images (SVG, PNG, JPG, or GIF; max: 800×400px)
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags*</FormLabel>
                      <FormControl>
                        <Input placeholder="Add tags separated by commas" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Section>

              {/* ── Section 2: Prize Sponsorship ── */}
              <Section number={2} title="Prize Sponsorship">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="sponsorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Sponsor Name*</FormLabel>
                          <div className="flex gap-2">
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder="Select Sponsor" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {sponsors
                                  .filter((s) => s.status === "Active")
                                  .map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                      {s.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <Button type="button" variant="outline" size="sm">
                              + Add New Sponsor
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Sponsor Logos*</Label>
                    <div className="mt-2 h-24 border border-border rounded-lg flex items-center justify-center bg-muted/30">
                      {selectedSponsor && (selectedSponsor as any).logo?.[0] ? (
                        <img
                          src={(selectedSponsor as any).logo[0]}
                          alt="Sponsor logo"
                          className="max-h-20 max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">No logo uploaded</span>
                      )}
                    </div>
                  </div>
                </div>
              </Section>

              {/* ── Section 3: Prize Type & Dynamic Attributes ── */}
              <Section number={3} title="Prize Type & Dynamic Attributes">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="prizeCategory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prize Category*</FormLabel>
                          <div className="flex gap-2">
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder="Select Prize Category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories.map((c) => (
                                  <SelectItem key={c} value={c}>
                                    {c}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addCategory}
                            >
                              + Add New Type
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* Inline new category input */}
                    <Input
                      placeholder="New category name..."
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCategory())}
                      className="text-sm"
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="stockDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prize Stock Added/Updated*</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Section>

              {/* ── Section 4: Fulfillment & Logistics ── */}
              <Section number={4} title="Fulfillment & Logistics">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="fulfillmentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fulfillment Method*</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Fulfillment Method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {FULFILLMENT_METHODS.map((m) => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="deliveryTimeline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Timeline*</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Delivery Timeline" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DELIVERY_TIMELINES.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="claimWindow"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Claim Window*</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Claim Window" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CLAIM_WINDOWS.map((w) => (
                              <SelectItem key={w} value={w}>{w}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <FormField
                    control={form.control}
                    name="pickupRequired"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-3">
                        <FormLabel className="mt-0">Pickup Required</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div>
                    <Label className="text-sm font-medium">Eligible Regions*</Label>
                    <Select
                      onValueChange={(val) => toggleRegion(val)}
                      value=""
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue
                          placeholder={
                            selectedRegions.length > 0
                              ? selectedRegions.join(", ")
                              : "Select regions..."
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {REGIONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            <span className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "w-3 h-3 rounded-sm border",
                                  selectedRegions.includes(r)
                                    ? "bg-primary border-primary"
                                    : "border-input"
                                )}
                              />
                              {r}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="retailValueUSD"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prize Value*</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="$1000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div>
                    <Label className="text-sm font-medium">Break-even Value</Label>
                    <Input
                      readOnly
                      value={`$${breakEvenValue}`}
                      className="mt-2 bg-muted"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      25% of retail value
                    </p>
                  </div>
                </div>
              </Section>

              {/* ── Section 5: Rules & Restrictions ── */}
              <Section number={5} title="Rules & Restrictions">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="ageRestriction"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Age Restriction*</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 18+" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="idRequired"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormLabel className="mt-0">ID Required</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Terms & Conditions*</Label>
                    <FormField
                      control={form.control}
                      name="useStandardTerms"
                      render={({ field }) => (
                        <RadioGroup
                          value={field.value ? "standard" : "custom"}
                          onValueChange={(v) => field.onChange(v === "standard")}
                          className="space-y-3"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="standard" id="standard" />
                              <Label htmlFor="standard" className="font-medium">
                                Use Standard Terms & Conditions
                              </Label>
                            </div>
                            {useStandard && (
                              <div className="ml-6 space-y-2">
                                <p className="text-xs text-muted-foreground">
                                  Review and accept our standard terms and conditions for your prize
                                </p>
                                <div className="flex items-center gap-3 border border-border rounded-lg p-3">
                                  <FileText className="h-4 w-4 text-primary" />
                                  <span className="text-sm flex-1">Standard Terms & Conditions</span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="text-primary border-primary"
                                    onClick={() =>
                                      window.open(
                                        form.getValues("termsConditionsUrl") || "#",
                                        "_blank"
                                      )
                                    }
                                  >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Review Terms
                                  </Button>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    id="acceptTerms"
                                    checked={form.watch("acceptedTerms")}
                                    onCheckedChange={(v) =>
                                      form.setValue("acceptedTerms", !!v)
                                    }
                                  />
                                  <Label htmlFor="acceptTerms" className="text-xs">
                                    I accept the standard terms & conditions
                                  </Label>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="custom" id="custom" />
                              <Label htmlFor="custom" className="font-medium">
                                Custom Terms & Conditions
                              </Label>
                            </div>
                            {!useStandard && (
                              <div className="ml-6 space-y-2">
                                <p className="text-xs text-muted-foreground">
                                  Provide a link or upload your own terms & conditions document
                                </p>
                                <FormField
                                  control={form.control}
                                  name="customTermsUrl"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input placeholder="https://..." {...field} />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            )}
                          </div>
                        </RadioGroup>
                      )}
                    />
                  </div>
                </div>
              </Section>

              {/* ── Section 6: Notes ── */}
              <Section number={6} title="Notes">
                <FormField
                  control={form.control}
                  name="additionalInfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Information</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter any additional information"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </Section>
            </div>

            {/* ── Sticky footer ── */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-background">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
